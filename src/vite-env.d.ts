/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_APP_URL: string
  readonly VITE_CONTAOVOS_BASE_URL?: string
  readonly VITE_CONTAOVOS_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
