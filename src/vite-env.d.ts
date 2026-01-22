/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ODOO_URL: string
  readonly VITE_ODOO_DB: string
  readonly VITE_ODOO_USERNAME: string
  readonly VITE_ODOO_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
