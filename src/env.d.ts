/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string; // Changed from VITE_SUPABASE_KEY
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}