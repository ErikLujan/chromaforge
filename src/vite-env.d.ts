/// <reference types="vite/client" />

// ============================================================================
// Vite Environment Typings
//
// Exposes strongly-typed access to the `import.meta.env` variables ChromaForge
// consumes. Only `VITE_`-prefixed variables are inlined into the client bundle
// — never place secrets (service role keys, management tokens) here.
// ============================================================================

interface ImportMetaEnv {
  /** Supabase project URL, e.g. https://<project-ref>.supabase.co */
  readonly VITE_SUPABASE_URL: string;
  /** Supabase anon/publishable key (safe for client-side use) */
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
