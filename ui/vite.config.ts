import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import fs from 'fs'
import path from 'path'
import { homedir } from 'os'

// Custom SSL certificate paths
const certDir = path.join(homedir(), '.vite-plugin-basic-ssl')
const certFile = path.join(certDir, 'cert.pem')
const keyFile = path.join(certDir, 'key.pem')

// Check if custom certificates exist
const customCertsExist = fs.existsSync(certFile) && fs.existsSync(keyFile)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Use basic SSL plugin as fallback if custom certificates don't exist
    !customCertsExist && basicSsl()
  ].filter(Boolean),
  server: {
    https: customCertsExist ? {
      key: fs.readFileSync(keyFile),
      cert: fs.readFileSync(certFile),
    } : undefined, // Let the basic SSL plugin handle HTTPS when enabled
    host: 'localhost',
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://localhost:7136',
        changeOrigin: true,
        secure: false, // Ignore SSL certificate issues for development
      }
    }
  }
})
