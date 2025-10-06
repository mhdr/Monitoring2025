import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { visualizer } from 'rollup-plugin-visualizer'
import { VitePWA } from 'vite-plugin-pwa'
// import PluginCritical from 'rollup-plugin-critical' // Available for manual critical CSS extraction
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
    // PWA plugin - service worker, manifest, and offline support
    VitePWA({
      registerType: 'prompt', // User consent before updating
      includeAssets: ['fonts/woff2/IRANSansXV.woff2', 'fonts/woff/IRANSansXV.woff', 'bootstrap-icons/fonts/*.woff*'],
      manifest: {
        name: 'Monitoring System 2025',
        short_name: 'Monitoring',
        description: 'Real-time monitoring and alarm management system',
        theme_color: '#0d6efd', // Bootstrap primary color
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'any',
        icons: [
          {
            src: 'icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png'
          },
          {
            src: 'icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png'
          },
          {
            src: 'icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png'
          },
          {
            src: 'icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png'
          },
          {
            src: 'icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png'
          },
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        // RTL support metadata
        dir: 'rtl' as const,
        lang: 'fa-IR'
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Increase maximum precache file size to allow large AG Grid Enterprise bundles (default is 2 * 1024 * 1024)
        // AG Grid enterprise bundles are ~5MB uncompressed; adjust cautiously to avoid bloating precache.
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MiB cap for selected large vendor assets
        runtimeCaching: [
          // Cache Bootstrap CSS variants (RTL/LTR) - CacheFirst with long expiration
          {
            urlPattern: /.*\/assets\/css\/bootstrap-(rtl|ltr)-.*\.css$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'bootstrap-css-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Cache font CSS - CacheFirst with long expiration
          {
            urlPattern: /.*\/assets\/css\/fonts-.*\.css$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts-css-cache',
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Cache font files - CacheFirst with very long expiration
          {
            urlPattern: /.*\/fonts\/(woff2?|ttf|otf|eot)\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Cache API calls - NetworkFirst with fallback to cache
          {
            urlPattern: /^https:\/\/localhost:7136\/api\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5 // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Cache other CSS files
          {
            urlPattern: /.*\.css$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'css-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Cache JS chunks
          {
            urlPattern: /.*\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'js-cache',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ],
        // Clean up old caches on activation
        cleanupOutdatedCaches: true,
        // Skip waiting and claim clients immediately
        skipWaiting: false, // Let user decide when to update
        clientsClaim: true
      },
      devOptions: {
        enabled: false, // Disable in dev mode for faster HMR
        type: 'module'
      }
    }),
    // Bundle analyzer - generates stats.html after build
    visualizer({
      open: false,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
    // Critical CSS extraction - runs after build to inline critical CSS
    // Note: Disabled by default as it requires a live server and puppeteer
    // Manual critical CSS extraction is already implemented in index.html
    // This plugin can be enabled for automated extraction if needed
    // PluginCritical({
    //   criticalUrl: 'https://localhost:5173/',
    //   criticalBase: './dist',
    //   criticalPages: [
    //     { uri: '', template: 'index' },
    //     { uri: 'login', template: 'index' }
    //   ],
    //   criticalConfig: {
    //     inline: true,
    //     extract: false,
    //     width: 1920,
    //     height: 1080,
    //     penthouse: {
    //       blockJSRequests: false
    //     }
    //   }
    // })
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
