/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** Empty until Grant supplies real Pixel ID after Field PASS. */
  readonly VITE_META_PIXEL_ID?: string
  /** '1' = Base low-back step removed (lib/lumbarFlag.ts). Unset in production = OFF. */
  readonly VITE_BASE_LUMBAR_REMOVED?: string
  /** 'on' turns on the one-time terms re-accept screen (default off; Sunday batch). */
  readonly VITE_TERMS_REACCEPT_GATE?: string
  /** 'on' turns on survey card B on My Body (default off; Sunday Oct 25 batch, after the client_feedback 'survey' migration). */
  readonly VITE_SURVEY_CARD_B?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
