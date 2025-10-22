/// <reference types="vite/client" />

/**
 * TypeScript type definitions for Vite environment variables
 * @see https://vitejs.dev/guide/env-and-mode.html#env-files
 */

interface ImportMetaEnv {
  /**
   * Backend API base URL
   * Development: https://localhost:7136
   * Production: Set via .env.production (e.g., https://api.yourdomain.com)
   */
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
