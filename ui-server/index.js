const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 8080;

// SSL Certificate paths
const certPath = path.join(__dirname, 'certificates', 'ui-server-cert.pem');
const keyPath = path.join(__dirname, 'certificates', 'ui-server-key.pem');

// Check if SSL certificates exist
const sslEnabled = fs.existsSync(certPath) && fs.existsSync(keyPath);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Handle React Router - send all requests to index.html
// Note: In Express v5, use a middleware instead of app.get('*')
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server with HTTPS if certificates are available
if (sslEnabled) {
    const options = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
    };
    
    https.createServer(options, app).listen(port, () => {
        console.log(`🔒 HTTPS Server listening at https://localhost:${port}`);
        console.log(`Using SSL certificates from ${path.join(__dirname, 'certificates')}`);
    });
} else {
    // Fallback to HTTP if no certificates found
    app.listen(port, () => {
        console.log(`⚠️  HTTP Server listening at http://localhost:${port}`);
        console.log(`SSL certificates not found. Run 'npm run create-ssl' to enable HTTPS.`);
    });
}
