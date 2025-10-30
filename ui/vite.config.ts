/// <reference types="vite/client" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { VitePWA } from 'vite-plugin-pwa'
import viteCompression from 'vite-plugin-compression'
// import PluginCritical from 'rollup-plugin-critical' // Available for manual critical CSS extraction

// https://vite.dev/config/
export default defineConfig({
  // Base path for deployment - supports subpath deployment like /dashboard/monitoring/
  // Set via VITE_BASE_PATH environment variable, defaults to / (root)
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [
    react(),
    // Brotli compression - generates .br files (best compression for modern browsers)
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024, // Only compress files > 1KB
      deleteOriginFile: false, // Keep original files
      compressionOptions: {
        level: 11, // Maximum compression (0-11)
      },
    }),
    // Gzip compression - generates .gz files (fallback for older browsers)
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024,
      deleteOriginFile: false,
      compressionOptions: {
        level: 9, // Maximum compression (0-9)
      },
    }),
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
        // Scope and start_url use base path for flexible deployment
        scope: process.env.VITE_BASE_PATH || '/',
        start_url: process.env.VITE_BASE_PATH || '/',
        orientation: 'any',
        // Use existing scalable SVG icon. If you add PNG icons later, update this array accordingly.
        icons: [
          {
            src: 'icons/eye.svg',
            sizes: 'any',
            type: 'image/svg+xml',
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
  globIgnores: ['**/stats.html', '**/sw-message-handler.js', '**/ag-grid-*.js', '**/echarts-*.js', '**/index-*.js'],
        // Import custom message handler for cache invalidation
        importScripts: ['sw-message-handler.js'],
  // Increase maximum file size to accommodate larger vendor chunks (no JS minification)
  // AG Grid and ECharts can exceed 2MB without minification
  maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
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
          // Protocol-agnostic pattern: matches /api/ on any protocol (HTTP/HTTPS) or host
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
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
        // Manual chunk splitting for better caching (avoid splitting Emotion/Stylis explicitly)
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // Keep React with vendor to avoid TDZ issues

            // React Router - needed for routing
            if (id.includes('react-router')) {
              return 'react-router';
            }

            // Redux - state management
            if (id.includes('@reduxjs/toolkit') || id.includes('react-redux') || id.includes('redux')) {
              return 'redux';
            }

            // MUI Core - Material-UI components
            if (id.includes('@mui/material') || id.includes('@mui/system') || id.includes('@mui/base')) {
              return 'mui-core';
            }

            // MUI Icons - can be separate for lazy loading
            if (id.includes('@mui/icons-material')) {
              return 'mui-icons';
            }

            // i18n - internationalization
            if (id.includes('i18next') || id.includes('react-i18next')) {
              return 'i18n';
            }

            // AG Grid
            if (id.includes('ag-grid-enterprise') || id.includes('ag-grid-community') || id.includes('ag-grid-react')) {
              return 'ag-grid';
            }

            // ECharts
            if (id.includes('echarts') || id.includes('echarts-for-react')) {
              return 'echarts';
            }

            // Date utils
            if (id.includes('jalaali') || id.includes('jalalidatepicker')) {
              return 'date-utils';
            }

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
    // Use terser with safe settings to avoid TDZ issues
    minify: 'terser',
    terserOptions: {
      ecma: 2020,
      compress: {
        // Enable compression with safe settings
        drop_console: true, // Remove console.* calls
        drop_debugger: true, // Remove debugger statements
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'], // Remove specific console calls
        passes: 2, // Two passes for better optimization
        // Keep safe settings to avoid React/Emotion/MUI issues
        keep_classnames: true, // Required for MUI and Emotion
        keep_fnames: true, // Required for React component names in dev tools
        arrows: true, // Convert functions to arrow functions where possible
        arguments: false, // Don't optimize 'arguments' usage (can break code)
        booleans: true, // Optimize boolean expressions
        collapse_vars: true, // Collapse single-use variables
        comparisons: true, // Optimize comparisons
        computed_props: true, // Optimize computed property access
        conditionals: true, // Optimize if-s and conditional expressions
        dead_code: true, // Remove unreachable code
        evaluate: true, // Evaluate constant expressions
        hoist_funs: false, // Don't hoist function declarations (can cause issues)
        hoist_props: true, // Optimize sequences of assignments
        hoist_vars: false, // Don't hoist var declarations (can cause issues)
        if_return: true, // Optimize if/return and if/continue
        inline: true, // Inline functions when beneficial
        join_vars: true, // Join consecutive var statements
        loops: true, // Optimize loops
        negate_iife: false, // Don't negate IIFEs (can break code)
        properties: true, // Optimize property access
        reduce_funcs: false, // Don't reduce functions (can cause issues)
        reduce_vars: true, // Collapse variables assigned with single-use values
        sequences: true, // Join consecutive statements with comma operator
        side_effects: true, // Remove side-effect-free statements
        switches: true, // De-duplicate and remove unreachable switch branches
        toplevel: false, // Don't drop unreferenced top-level functions/vars
        typeofs: true, // Optimize typeof expressions
        unused: true, // Drop unreferenced functions and variables
      },
      mangle: {
        safari10: true, // Work around Safari 10 bugs
        properties: false, // Don't mangle property names (breaks MUI/Emotion)
      },
      format: {
        comments: false, // Remove all comments
        ecma: 2020, // Use ES2020 syntax
        safari10: true, // Work around Safari 10 bugs
      },
    },
  // Source maps for production debugging (can be set to true temporarily if further investigation needed)
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
