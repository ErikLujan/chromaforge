import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase.client';
import { sanitizeText } from '@/utils/sanitization.utils';

/**
 * Profile Service — data-access boundary for the public `profiles` table.
 *
 * Owns the single `profiles` upsert so presentation components never issue
 * SQL-adjacent queries directly. The free-text display name is sanitized at
 * this boundary before reaching the public row.
 */

/** Input accepted by `upsertProfile`. */
export interface UpsertProfileInput {
  /** The newly created auth user id (`profiles.id`). */
  readonly id: string;
  /** The display name entered during registration (sanitized before write). */
  readonly username: string;
  /** The registered email address. */
  readonly email: string;
  /** The linked avatar URL, when one was uploaded. */
  readonly avatarUrl?: string;
}

/**
 * Creates or replaces the public `profiles` row for a freshly registered
 * account. Best-effort by design: callers treat a returned error as logged
 * and never block the signup success path on it.
 *
 * @param {UpsertProfileInput} input The profile row to write.
 * @returns {Promise<{ error: PostgrestError | null }>} The PostgREST error, or `null` on success.
 */
export async function upsertProfile(input: UpsertProfileInput): Promise<{ error: PostgrestError | null }> {
  const { error } = await supabase.from('profiles').upsert({
    id: input.id,
    username: sanitizeText(input.username),
    email: input.email,
    ...(input.avatarUrl ? { avatar_url: input.avatarUrl } : {}),
  });

  return { error };
}
