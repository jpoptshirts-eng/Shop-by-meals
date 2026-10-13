/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional. Not required for the CSV product catalogue. */
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.csv?raw' {
  const content: string
  export default content
}
