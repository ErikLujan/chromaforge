import { create } from 'zustand';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase.client';
import { flushPendingAvatar } from '@/services/avatar.service';

/**
 * Auth Store — Zustand domain store for session state and Supabase auth actions.
 *
 * `initialize` restores the persisted session and subscribes to
 * `onAuthStateChange` so the store stays in sync with token refresh, sign-out,
 * and auth-code redirects. `user` is derived from `session` to avoid
 * duplicated state.
 */

export interface SignInResult {
  /** The auth error, or `null` on success. */
  error: AuthError | null;
}

export interface SignUpResult {
  /** The signed-in user, or `null` when the request failed. */
  user: User | null;
  /**
   * The active session. `null` when email confirmation is enabled and the
   * account still needs to be confirmed.
   */
  session: Session | null;
  /** The auth error, or `null` on success. */
  error: AuthError | null;
}

interface AuthState {
  /** The current Supabase auth session, or `null` when signed out. */
  session: Session | null;
  /** The signed-in user, derived from `session`. */
  user: User | null;
  /** `true` while the initial session restore is in flight. */
  isLoading: boolean;
  /**
   * Replaces the current session. Also updates `user` and marks the store as
   * no longer loading. Pass `null` to clear auth state.
   */
  setSession: (session: Session | null) => void;
  /**
   * Publishes the avatar URL into the current session and user metadata.
   * Called immediately after a storage upload so the UI updates
   * deterministically instead of waiting for the async auth event; the value
   * then survives a reload because `getSession()` restores it from the same
   * metadata. Pass `null` to clear the avatar.
   *
   * @param {string | null} avatarUrl The public avatar URL, or `null`.
   * @returns {void}
   */
  setAvatarUrl: (avatarUrl: string | null) => void;
  /**
   * Restores the persisted session and subscribes to Supabase auth state
   * changes. Safe to call once at application startup.
   *
   * @returns {Promise<void>} Resolves once the session has been restored.
   */
  initialize: () => Promise<void>;
  /**
   * Signs a user in with email and password and, on success, publishes the
   * returned session to the store. Flushes any avatar parked during sign-up
   * once a session exists.
   *
   * @param {string} email The user's email address.
   * @param {string} password The user's password.
   * @returns {Promise<SignInResult>} The auth error, if any.
   */
  signIn: (email: string, password: string) => Promise<SignInResult>;
  /**
   * Creates a new account and, when the project returns a session (email
   * confirmation disabled), publishes it to the store. The display name is
   * passed through `options.data` so it lands in `user_metadata.name`.
   * Flushes any parked avatar when a session is returned.
   *
   * @param {string} email The new account's email address.
   * @param {string} password The new account's password.
   * @param {string} [name] The display name entered during registration.
   * @returns {Promise<SignUpResult>} The created user, session and error.
   */
  signUp: (email: string, password: string, name?: string) => Promise<SignUpResult>;
  /** Signs the current user out and clears the store. */
  signOut: () => Promise<void>;
}

const initialState = {
  session: null,
  user: null,
  isLoading: true,
};

export const useAuthStore = create<AuthState>()((set) => ({
  ...initialState,

  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
      isLoading: false,
    }),

  setAvatarUrl: (avatarUrl) =>
    set((state) => {
      if (!state.session || !state.user) return state;
      const user = {
        ...state.user,
        user_metadata: { ...state.user.user_metadata, avatar_url: avatarUrl },
      };
      return { session: { ...state.session, user }, user };
    }),

  initialize: async () => {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    set({ session, user: session?.user ?? null, isLoading: false });

    supabase.auth.onAuthStateChange((_event, nextSession) => {
      set({
        session: nextSession,
        user: nextSession?.user ?? null,
        isLoading: false,
      });
    });
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (data.session) {
      set({
        session: data.session,
        user: data.session.user,
        isLoading: false,
      });
      void flushPendingAvatar(data.session.user.id, email);
    }

    return { error };
  },

  signUp: async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: name ? { data: { name } } : undefined,
    });

    if (data.session) {
      set({
        session: data.session,
        user: data.session.user,
        isLoading: false,
      });
      void flushPendingAvatar(data.session.user.id, email);
    }

    return { user: data.user, session: data.session, error };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },
}));
