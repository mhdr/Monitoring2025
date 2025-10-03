const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

// Configuration
const CERT_DIR = path.join(os.homedir(), '.vite-plugin-basic-ssl');
const CERT_FILE = path.join(CERT_DIR, 'cert.pem');
const KEY_FILE = path.join(CERT_DIR, 'key.pem');

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  nc: '\x1b[0m' // No Color
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.nc}`);
}

function regenerateCerts() {
  log('blue', '🔒 (Re)generating and trusting dev certificates...');

  try {
    if (os.platform() === 'win32') {
      // On Windows, run the PowerShell script
      execSync('powershell -ExecutionPolicy Bypass -File ./trust-dev-certs.ps1', { stdio: 'inherit' });
    } else {
      // On Unix-like systems, run the shell script
      execSync('chmod +x trust-dev-certs.sh && ./trust-dev-certs.sh', { stdio: 'inherit' });
    }
    
    log('green', '✅ SSL setup completed!');
    log('yellow', '⚠️  IMPORTANT: Please restart your browser completely before accessing the app');
  } catch (error) {
    log('red', `❌ Error generating certificates: ${error.message}`);
    process.exit(1);
  }
}

// Main check
function main() {
  let needsRegen = false;

  // Check if certificate and key files exist
  if (!fs.existsSync(CERT_FILE) || !fs.existsSync(KEY_FILE)) {
    log('yellow', '⚠️  Dev certificate/key missing');
    needsRegen = true;
  }

  // If certificate files exist, perform additional checks
  if (!needsRegen) {
    try {
      const certContent = fs.readFileSync(CERT_FILE, 'utf8');
      
      // Check if certificate includes required SAN entries
      if (!certContent.includes('localhost') && !certContent.includes('127.0.0.1')) {
        log('yellow', '⚠️  Missing required SAN entries');
        needsRegen = true;
      } else {
        // If OpenSSL is available, perform deeper checks
        try {
          const certInfo = execSync('openssl x509 -in "' + CERT_FILE + '" -noout -text', { encoding: 'utf8' });
          
          // Check expiration (regenerate if less than 10 days remaining)
          const endDateMatch = certInfo.match(/Not After\s*:\s*(.+)/);
          if (endDateMatch) {
            const endDate = new Date(endDateMatch[1].trim());
            const daysRemaining = (endDate - new Date()) / (1000 * 60 * 60 * 24);
            
            if (daysRemaining < 10) {
              log('yellow', `⚠️  Dev certificate expiring soon (${Math.round(daysRemaining)} days remaining)`);
              needsRegen = true;
            }
          }
          
          // Check for Digital Signature in Key Usage
          if (!certInfo.includes('Digital Signature')) {
            log('yellow', '⚠️  Key Usage missing Digital Signature');
            needsRegen = true;
          }
        } catch (error) {
          // If OpenSSL is not available or fails, we'll continue without these checks
          log('yellow', '⚠️  OpenSSL not available for deeper checks');
        }
      }
    } catch (error) {
      log('red', `❌ Error reading certificate: ${error.message}`);
      needsRegen = true;
    }
  }

  if (needsRegen) {
    regenerateCerts();
  } else {
    log('green', '✅ Dev certificate valid');
  }
}

// Run the main function
main();