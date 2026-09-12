import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase.types';
import { env } from '@/config/env';

/**
 * Supabase Client — single application-wide instance.
 *
 * Public configuration is validated centrally in `@/config/env`, so a missing
 * value fails fast at startup and every consumer stays free of null-checks.
 * The anon/publishable key is used here; the service-role key must stay
 * server-side because it bypasses Row Level Security.
 */

/**
 * The application-wide Supabase client.
 *
 * Auth is configured to persist the session in local storage, auto-refresh the
 * access token, and detect auth codes returned via URL redirect (OAuth / magic
 * link flows). Authorization for protected data is enforced by Supabase RLS and
 * Storage policies, not by the client.
 */
export const supabase: SupabaseClient<Database> = createClient<Database>(
  env.supabaseUrl,
  env.supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
