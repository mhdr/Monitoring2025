/// <reference types="vite/client" />

/**
 * TypeScript type definitions for Vite environment variables
 * @see https://vitejs.dev/guide/env-and-mode.html#env-files
 */

interface ImportMetaEnv {
  /**
   * Backend API base URL
   * Development: http://localhost:5030
   * Production: Set via .env.production (e.g., http://api.yourdomain.com)
   */
  readonly VITE_API_BASE_URL: string;
  
  /**
   * Base path for deployment (must start and end with /)
   * Root deployment: /
   * Subpath deployment: /dashboard/monitoring/
   * Default: /
   */
  readonly VITE_BASE_PATH: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
