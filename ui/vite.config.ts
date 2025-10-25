/// <reference types="vite/client" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { VitePWA } from 'vite-plugin-pwa'
// import PluginCritical from 'rollup-plugin-critical' // Available for manual critical CSS extraction

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // PWA plugin - service worker, manifest, and offline support
    VitePWA({
      registerType: 'prompt', // User consent before updating
      includeAssets: ['fonts/woff2/IRANSansXV.woff2', 'fonts/woff/IRANSansXV.woff'], // Persian fonts
      manifest: {
        name: 'Monitoring System 2025',
        short_name: 'Monitoring',
        description: 'Real-time monitoring and alarm management system',
        theme_color: '#1976d2', // MUI primary color (blue)
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
        // Exclude stats files and SW message handler from precache
        globIgnores: ['**/stats.html', '**/sw-message-handler.js'],
        // Import custom message handler for cache invalidation
        importScripts: ['sw-message-handler.js'],
        // Increase maximum file size to accommodate larger vendor chunks
        // AG Grid (~1.3MB) and ECharts (~820KB) can now be precached if needed
        // This significantly improves new tab load performance since chunks are already in cache
        maximumFileSizeToCacheInBytes: 2 * 1024 * 1024, // 2 MB - allows precaching of large chunks
        runtimeCaching: [
          // Cache ALL JavaScript chunks - CacheFirst strategy with long expiration
          // This ensures any chunk loaded in one tab is immediately available in new tabs
          {
            urlPattern: /.*\/assets\/.*\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'js-chunks-cache',
              expiration: {
                maxEntries: 100, // Increased to accommodate all possible chunks
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Cache page chunks - CacheFirst
          {
            urlPattern: /.*\/assets\/(dashboard|monitoring|active-alarms|alarm-log|trend-analysis|data-table|settings|profile|sync)-.*\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'page-chunks-cache',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Cache MUI theme CSS - CacheFirst with long expiration
          {
            urlPattern: /.*\/assets\/css\/mui-.*\.css$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mui-css-cache',
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
          // Cache API calls - StaleWhileRevalidate for better performance
          // Serves cached data immediately while fetching fresh data in background
          // This works well with TTL system and cache invalidation
          {
            urlPattern: /^http:\/\/localhost:5030\/api\/.*/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 30 // 30 minutes (matches localStorage TTL threshold)
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Cache ALL CSS files - CacheFirst with long expiration
          {
            urlPattern: /.*\.css$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'css-cache',
              expiration: {
                maxEntries: 50, // Increased for all CSS chunks
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
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
    //   criticalUrl: 'http://localhost:5173/',
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
    host: '0.0.0.0', // Allow network access via IP address
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:5030',
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('[Vite Proxy] Error connecting to backend:', err.message);
            console.log('[Vite Proxy] Make sure the backend server is running on http://localhost:5030');
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('[Vite Proxy] Forwarding:', req.method, req.url, '→', proxyReq.getHeader('host'));
          });
        },
      },
      '/hubs': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:5030',
        changeOrigin: true,
        ws: true, // Enable WebSocket proxying for SignalR
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('[Vite Proxy] SignalR Error:', err.message);
          });
        },
      }
    }
  },
  build: {
    // Build optimization configuration
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: (id) => {
          // Critical vendor chunks - loaded early
          if (id.includes('node_modules')) {
            // React core - always needed first
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-core';
            }
            
            // React Router - needed for routing
            if (id.includes('react-router')) {
              return 'react-router';
            }
            
            // Redux - state management
            if (id.includes('@reduxjs/toolkit') || id.includes('react-redux') || id.includes('redux')) {
              return 'redux';
            }
            
            // Skip MUI, emotion, and stylis - let Vite handle these automatically
            // Manual chunking was causing circular dependency issues
            // These will be included in the vendor chunk or split automatically
            
            // MUI Icons - can be separate for lazy loading
            if (id.includes('@mui/icons-material')) {
              return 'mui-icons';
            }
            
            // i18n - internationalization
            if (id.includes('i18next') || id.includes('react-i18next')) {
              return 'i18n';
            }
            
            // AG Grid Enterprise - LARGE (5MB+), only load when needed
            if (id.includes('ag-grid-enterprise') || id.includes('ag-grid-community')) {
              return 'ag-grid';
            }
            
            // AG Grid React wrapper - small, bundle with AG Grid
            if (id.includes('ag-grid-react')) {
              return 'ag-grid';
            }
            
            // ECharts - LARGE (~1MB), only for charts
            if (id.includes('echarts') || id.includes('echarts-for-react')) {
              return 'echarts';
            }
            
            // Date libraries - Jalali calendar
            if (id.includes('jalaali') || id.includes('jalalidatepicker')) {
              return 'date-utils';
            }
            
            // Other vendor dependencies
            return 'vendor';
          }
          
          // Layout components - used across multiple routes
          if (id.includes('/src/components/DashboardLayout') || 
              id.includes('/src/components/Sidebar') || 
              id.includes('/src/components/ResponsiveNavbar')) {
            return 'layout';
          }
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
    // Set to 1100 KB to accommodate ECharts and AG Grid vendor chunks
    // These are acceptable since they're only loaded when their pages are accessed
    chunkSizeWarningLimit: 1100,
    // Minification configuration for better compression
    minify: 'esbuild', // Changed from 'terser' to 'esbuild' - better handling of circular deps
    // Source maps for production debugging (disabled for performance)
    sourcemap: false,
    // CSS code splitting configuration
    cssCodeSplit: true,
    // Performance budgets and warnings
    reportCompressedSize: true,
    // Asset size limits for warnings
    assetsInlineLimit: 4096, // Inline assets smaller than 4KB
    // Target modern browsers for smaller bundle size
    target: 'es2020',
    // CSS minification
    cssMinify: true
  },
  // Performance monitoring and optimization hints
  optimizeDeps: {
    // Pre-bundle dependencies for faster development
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'i18next',
      'react-i18next',
      '@mui/material',
      '@mui/icons-material',
      '@emotion/react',
      '@emotion/styled',
      '@emotion/cache',
      'stylis',
    ],
    // Exclude large dependencies that should be loaded on-demand
    exclude: [
      'ag-grid-enterprise',
      'ag-grid-community',
      'echarts',
    ],
  },
  // Experimental features for better performance
  esbuild: {
    // Drop console statements in production
    drop: ['console', 'debugger'],
    legalComments: 'none',
  },
})
