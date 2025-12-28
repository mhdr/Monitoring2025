/**
 * Express.js Production Server for EMS3 UI
 * 
 * Features:
 * - Pre-compressed file serving (.br, .gz) for optimal performance
 * - Dynamic gzip/brotli compression fallback
 * - Static file serving from dist/
 * - SPA routing (all non-file routes → index.html)
 * - Enhanced security headers (CSP, HSTS-ready)
 * - Access logging with response time
 * - Graceful shutdown
 * - Health check endpoint
 */

const express = require('express');
const compression = require('compression');
const expressStaticGzip = require('express-static-gzip');
const path = require('path');
const fs = require('fs');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;
const API_URL = process.env.API_URL || 'http://localhost:5030';
const DIST_DIR = path.join(__dirname, 'dist');

// Verify dist directory exists
if (!fs.existsSync(DIST_DIR)) {
  console.error('[ERROR] dist directory not found at:', DIST_DIR);
  console.error('[ERROR] Please run "npm run build" first');
  process.exit(1);
}

console.log('[INFO] Starting EMS3 UI Server...');
console.log('[INFO] Dist directory:', DIST_DIR);
console.log('[INFO] Port:', PORT);
console.log('[INFO] API URL:', API_URL);

// API Proxy - MUST come BEFORE body parsers to preserve request stream
app.use('/api', createProxyMiddleware({
  target: API_URL,
  changeOrigin: true,
  logLevel: 'debug',
  onProxyReq: (proxyReq, req, res) => {
    console.log('[Proxy] Forwarding request:', req.method, `${API_URL}/api${req.url}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log('[Proxy] Response:', proxyRes.statusCode, req.url);
  },
  onError: (err, req, res) => {
    console.error('[Proxy Error]', err.message);
    res.status(502).json({ error: 'Bad Gateway', message: 'Failed to connect to backend API' });
  }
}));

app.use('/hubs', createProxyMiddleware({
  target: API_URL,
  changeOrigin: true,
  ws: true, // Enable WebSocket proxying for SignalR
  logLevel: 'debug',
  onError: (err, req, res) => {
    console.error('[Proxy Error]', err.message);
    res.status(502).json({ error: 'Bad Gateway', message: 'Failed to connect to backend API' });
  }
}));

// Request logging middleware with response time
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const size = res.get('Content-Length') || 0;
    const encoding = res.get('Content-Encoding') || 'none';
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} ${duration}ms ${size}B (${encoding})`);
  });
  next();
});

// Dynamic compression for responses not served from pre-compressed files
app.use(compression({
  level: 6, // Balanced compression
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    // Skip compression if pre-compressed file was served
    if (res.get('Content-Encoding')) {
      return false;
    }
    // Compress unless explicitly disabled
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Security headers (basic only - no CSP to avoid blocking issues)
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
});

// Health check endpoint (for load balancers, monitoring)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Serve static files from dist/ with pre-compressed file support
// Serves .br (Brotli) or .gz (Gzip) files when available, with automatic fallback to original
app.use('/assets', expressStaticGzip(path.join(DIST_DIR, 'assets'), {
  enableBrotli: true,
  orderPreference: ['br', 'gz'], // Prefer Brotli over Gzip
  serveStatic: {
    maxAge: '1y', // 1 year cache for hashed assets
    immutable: true,
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      // Add preload hints for critical assets
      if (filePath.includes('index-') && filePath.endsWith('.js')) {
        res.setHeader('Link', '<' + filePath + '>; rel=preload; as=script');
      }
      if (filePath.endsWith('.css')) {
        res.setHeader('Link', '<' + filePath + '>; rel=preload; as=style');
      }
    }
  }
}));

app.use('/fonts', expressStaticGzip(path.join(DIST_DIR, 'fonts'), {
  enableBrotli: true,
  orderPreference: ['br', 'gz'],
  serveStatic: {
    maxAge: '1y',
    immutable: true
  }
}));

app.use('/icons', expressStaticGzip(path.join(DIST_DIR, 'icons'), {
  enableBrotli: true,
  orderPreference: ['br', 'gz'],
  serveStatic: {
    maxAge: '30d'
  }
}));

// Service worker and manifest with no cache
app.get('/sw.js', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Service-Worker-Allowed', '/');
  res.sendFile(path.join(DIST_DIR, 'sw.js'));
});

app.get('/manifest.webmanifest', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(DIST_DIR, 'manifest.webmanifest'));
});

// Other root-level files (with pre-compressed file support)
app.use(expressStaticGzip(DIST_DIR, {
  enableBrotli: true,
  orderPreference: ['br', 'gz'],
  serveStatic: {
    maxAge: 0, // No cache for root files
    etag: true,
    lastModified: true,
    index: false // We'll handle index.html manually
  }
}));

// SPA routing: serve index.html for all non-file routes
app.get('*', (req, res) => {
  // Check if request is for a file (has extension)
  const ext = path.extname(req.path);

  if (ext) {
    // Request for a file that doesn't exist
    // Send proper 404 with correct content type to prevent MIME type errors
    res.status(404).type('text/plain').send('File not found');
    return;
  }

  // Serve index.html for all routes (SPA)
  // Use ETag for validation but revalidate on every request
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  
  // Check if pre-compressed version exists
  const indexPath = path.join(DIST_DIR, 'index.html');
  const brPath = indexPath + '.br';
  const gzPath = indexPath + '.gz';
  
  // Serve pre-compressed file if available and client supports it
  const acceptEncoding = req.headers['accept-encoding'] || '';
  
  if (acceptEncoding.includes('br') && fs.existsSync(brPath)) {
    res.setHeader('Content-Encoding', 'br');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.sendFile(brPath);
  }
  
  if (acceptEncoding.includes('gzip') && fs.existsSync(gzPath)) {
    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.sendFile(gzPath);
  }
  
  // Fallback to uncompressed file
  res.sendFile(indexPath);
});

// Error handling
app.use((err, req, res, next) => {
  console.error('[Error]', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('========================================');
  console.log('EMS3 UI Server Started');
  console.log('========================================');
  console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`Port: ${PORT}`);
  console.log(`Serving from: ${DIST_DIR}`);
  console.log('');
  console.log('Access URLs:');
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Network: http://<your-ip>:${PORT}`);
  console.log('');
  console.log('Health check: http://localhost:' + PORT + '/health');
  console.log('========================================');
  console.log('');
}).on('error', (err) => {
  console.error('[ERROR] Failed to start server:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.error(`[ERROR] Port ${PORT} is already in use`);
    console.error('[ERROR] Try changing the PORT environment variable or stop the conflicting process');
  }
  process.exit(1);
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n[${signal}] Shutting down gracefully...`);
  
  server.close(() => {
    console.log('Server closed. Exiting process.');
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection]', reason);
});

module.exports = app;
