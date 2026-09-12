// ===========================================================================
// Environment Configuration — Centralized Public Config Boundary
// ===========================================================================
//
// ChromaForge exposes only `VITE_`-prefixed variables to the browser bundle.
// Every value reachable from this module is therefore public by design and must
// never include a privileged credential. The Supabase project URL and the
// anon/publishable key are intended for client use; service-role keys, personal
// access tokens, and database secrets must remain server-side.

type EnvRecord = Record<string, string | boolean | undefined>;

const envRecord = import.meta.env as EnvRecord;

/**
 * Reads a public environment variable, returning `undefined` for empty values.
 *
 * @param {string} key - The `VITE_`-prefixed variable name.
 * @returns {string | undefined} The trimmed value, or `undefined` when absent.
 */
function readPublicEnv(key: string): string | undefined {
  const value = envRecord[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Fails fast when a required public configuration value is missing.
 *
 * Error messages intentionally omit the offending value so secrets are never
 * echoed into logs or the browser console.
 *
 * @param {string} key - The required `VITE_`-prefixed variable name.
 * @returns {string} The validated, non-empty value.
 */
function requirePublicEnv(key: string): string {
  const value = readPublicEnv(key);
  if (!value) {
    throw new Error(
      `Missing required public environment variable: ${key}. ` +
        'Add it to your .env file (see .env.example).',
    );
  }
  return value;
}

// Defense-in-depth: the service-role key bypasses Row Level Security and must
// never reach the browser. A `VITE_`-prefixed copy would be inlined into the
// client bundle, so its mere presence is a configuration defect.
if (readPublicEnv('VITE_SUPABASE_SERVICE_ROLE_KEY')) {
  throw new Error(
    'VITE_SUPABASE_SERVICE_ROLE_KEY was found in client configuration. ' +
      'The service-role credential bypasses RLS and must remain server-side. ' +
      'Remove it from every VITE_-prefixed variable.',
  );
}

/**
 * Validated public client configuration.
 *
 * Use this object instead of reading `import.meta.env` directly so missing or
 * misconfigured values fail clearly at application startup.
 */
export const env = {
  supabaseUrl: requirePublicEnv('VITE_SUPABASE_URL'),
  supabaseAnonKey: requirePublicEnv('VITE_SUPABASE_ANON_KEY'),
} as const;

export type AppEnv = typeof env;
