/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" only in the static demo build (`vite build --mode demo`). */
  readonly VITE_DEMO_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
