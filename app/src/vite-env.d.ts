/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** Empty until Grant supplies real Pixel ID after Field PASS. */
  readonly VITE_META_PIXEL_ID?: string
  /** '1' = Base low-back step removed (lib/lumbarFlag.ts). Unset in production = OFF. */
  readonly VITE_BASE_LUMBAR_REMOVED?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
