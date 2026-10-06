/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** Empty until Grant supplies real Pixel ID after Field PASS. */
  readonly VITE_META_PIXEL_ID?: string
  /** 'on' turns on the one-time terms re-accept screen (default off; Sunday batch). */
  readonly VITE_TERMS_REACCEPT_GATE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
