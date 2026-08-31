/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MAX_FILE_SIZE_MB?: string;
  readonly NEXT_PUBLIC_SUPABASE_URL?: string;
  readonly NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
