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
          
          // ECharts - large charting library used only in TrendAnalysisPage
          // Isolate it so it's only loaded when needed
          'echarts-vendor': ['echarts', 'echarts-for-react'],
        },
        // Asset file naming with content hash for long-term caching
        assetFileNames: (assetInfo) => {
          // Organize assets into subdirectories
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];
          
          // CSS files in css/ directory
          if (ext === 'css') {
            return 'assets/css/[name]-[hash][extname]';
          }
          
          // Font files in fonts/ directory
          if (/woff2?|ttf|otf|eot/.test(ext)) {
            return 'assets/fonts/[name]-[hash][extname]';
          }
          
          // Images in images/ directory
          if (/png|jpe?g|svg|gif|webp|ico/.test(ext)) {
            return 'assets/images/[name]-[hash][extname]';
          }
          
          // Default for other assets
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
    // Chunk size warning limit
    // Set to 1100 KB to accommodate ECharts vendor chunk (~1050 KB)
    // This is acceptable since it's only loaded when TrendAnalysisPage is accessed
    chunkSizeWarningLimit: 1100,
    // Source maps for production debugging (optional, can be disabled)
    sourcemap: false,
    // CSS code splitting configuration
    cssCodeSplit: true,
    // Performance budgets and warnings
    reportCompressedSize: true,
    // Asset size limits for warnings
    assetsInlineLimit: 4096, // Inline assets smaller than 4KB
  },
  // Performance monitoring and optimization hints
  optimizeDeps: {
    // Pre-bundle dependencies for faster development
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@reduxjs/toolkit',
      'react-redux',
      'i18next',
      'react-i18next',
    ],
  },
})
