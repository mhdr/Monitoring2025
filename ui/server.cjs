/**
 * Express.js Production Server for EMS3 UI
 * 
 * Features:
 * - Gzip compression for all responses
 * - Static file serving from dist/
 * - SPA routing (all non-file routes → index.html)
 * - Security headers
 * - Access logging
 * - Graceful shutdown
 * - Health check endpoint
 */

const express = require('express');
const compression = require('compression');
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

// API Proxy - Forward /api/* and /hubs/* to backend
app.use('/api', createProxyMiddleware({
  target: API_URL,
  changeOrigin: true,
  logLevel: 'debug',
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

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Gzip compression for all responses
app.use(compression({
  level: 6, // Same as nginx config
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    // Compress unless explicitly disabled
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Security headers
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
    uptime: process.uptime()
  });
});

// Serve static files from dist/ with caching
app.use('/assets', express.static(path.join(DIST_DIR, 'assets'), {
  maxAge: '1y', // 1 year cache for hashed assets
  immutable: true,
  etag: true,
  lastModified: true
}));

app.use('/fonts', express.static(path.join(DIST_DIR, 'fonts'), {
  maxAge: '1y',
  immutable: true
}));

app.use('/icons', express.static(path.join(DIST_DIR, 'icons'), {
  maxAge: '30d'
}));

// Service worker and manifest with no cache
app.get('/sw.js', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Service-Worker-Allowed', '/');
  res.sendFile(path.join(DIST_DIR, 'sw.js'));
});

app.get('/manifest.webmanifest', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(DIST_DIR, 'manifest.webmanifest'));
});

// Other root-level files
app.use(express.static(DIST_DIR, {
  maxAge: 0, // No cache for index.html and other files
  etag: true,
  lastModified: true,
  index: false // We'll handle index.html manually
}));

// SPA routing: serve index.html for all non-file routes
app.get('*', (req, res) => {
  // Check if request is for a file (has extension)
  const ext = path.extname(req.path);

  if (ext) {
    // Request for a file that doesn't exist
    return res.status(404).send('File not found');
  }

  // Serve index.html for all routes (SPA) via redirect to leverage static middleware
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.redirect('/index.html');
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
