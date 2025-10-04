import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { visualizer } from 'rollup-plugin-visualizer'
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
    !customCertsExist && basicSsl(),
    // Bundle analyzer - generates stats.html after build
    visualizer({
      open: false,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    })
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
  },
  build: {
    // Build optimization configuration
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Vendor chunks - separate large dependencies
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'redux-vendor': ['@reduxjs/toolkit', 'react-redux'],
          'i18n-vendor': ['i18next', 'react-i18next'],
          
          // Layout components - used across multiple routes
          'layout-common': [
            './src/components/Sidebar.tsx',
            './src/components/ResponsiveNavbar.tsx',
            './src/components/LanguageSwitcher.tsx',
          ],
          
          // Detail pages - group together since they share context
          'detail-pages': [
            './src/components/detail/TrendAnalysisPage.tsx',
            './src/components/detail/DataTablePage.tsx',
            './src/components/detail/LiveMonitoringDetailPage.tsx',
            './src/components/detail/ActiveAlarmsDetailPage.tsx',
            './src/components/detail/AlarmLogDetailPage.tsx',
            './src/components/detail/AlarmCriteriaPage.tsx',
            './src/components/detail/AuditTrailDetailPage.tsx',
            './src/components/detail/ManagementDetailPage.tsx',
          ],
        },
      },
    },
    // Chunk size warning limit
    chunkSizeWarningLimit: 600,
    // Source maps for production debugging (optional, can be disabled)
    sourcemap: false,
  },
})
