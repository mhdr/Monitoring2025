#!/bin/bash

# Trust Development SSL Certificates for Chrome and Firefox on EndeavourOS
# This script adds the Vite development SSL certificate to system and browser trust stores

set -e

echo "🔐 Development SSL Certificate Trust Setup for EndeavourOS"
echo "==========================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}❌ This script should NOT be run as root${NC}"
   echo "Please run it as your regular user account"
   exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Install required packages if not present
echo -e "${BLUE}📦 Checking required packages...${NC}"

PACKAGES_TO_INSTALL=()

if ! command_exists openssl; then
    PACKAGES_TO_INSTALL+=("openssl")
fi

if ! command_exists certutil; then
    PACKAGES_TO_INSTALL+=("nss")
fi

if [ ${#PACKAGES_TO_INSTALL[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Installing required packages: ${PACKAGES_TO_INSTALL[*]}${NC}"
    echo "You may be prompted for your sudo password..."
    sudo pacman -S --needed "${PACKAGES_TO_INSTALL[@]}"
fi

# Certificate paths
VITE_CERT_DIR="$HOME/.vite-plugin-basic-ssl"
CERT_FILE="$VITE_CERT_DIR/cert.pem"
KEY_FILE="$VITE_CERT_DIR/key.pem"

# Always generate our own certificates with correct common name
echo -e "${BLUE}🔧 Generating proper localhost certificates...${NC}"
mkdir -p "$VITE_CERT_DIR"

# Remove existing certificates if they have wrong common name
if [ -f "$CERT_FILE" ]; then
    EXISTING_CN=$(openssl x509 -in "$CERT_FILE" -noout -subject 2>/dev/null | grep -o 'CN=[^,]*' | cut -d= -f2 || echo "")
    if [ "$EXISTING_CN" != "localhost" ]; then
        echo -e "${YELLOW}⚠️  Existing certificate has wrong CN: $EXISTING_CN (expected: localhost)${NC}"
        echo -e "${BLUE}�️  Removing old certificates...${NC}"
        rm -f "$CERT_FILE" "$KEY_FILE"
    fi
fi

# Generate new certificates if they don't exist or were removed
if [ ! -f "$CERT_FILE" ]; then
    # Generate private key
    openssl genrsa -out "$KEY_FILE" 2048
    
    # Create certificate configuration
    cat > "$VITE_CERT_DIR/cert.conf" << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = localhost

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = 127.0.0.1
IP.1 = 127.0.0.1
IP.2 = ::1
EOF
    
    # Generate certificate with proper configuration
    openssl req -new -x509 -key "$KEY_FILE" -out "$CERT_FILE" -days 365 \
        -config "$VITE_CERT_DIR/cert.conf" -extensions v3_req
    
    # Clean up config file
    rm -f "$VITE_CERT_DIR/cert.conf"
    
    echo -e "${GREEN}✅ Generated SSL certificates with CN=localhost${NC}"
    
    # Verify the certificate
    CN_CHECK=$(openssl x509 -in "$CERT_FILE" -noout -subject | grep -o 'CN=[^,]*' | cut -d= -f2)
    echo -e "${BLUE}📋 Certificate Common Name: $CN_CHECK${NC}"
fi

# Add certificate to system trust store
echo -e "${BLUE}🔒 Adding certificate to system trust store...${NC}"
SYSTEM_CERT_DIR="/etc/ca-certificates/trust-source/anchors"
CERT_NAME="vite-dev-localhost.crt"

if [ -d "$SYSTEM_CERT_DIR" ]; then
    sudo cp "$CERT_FILE" "$SYSTEM_CERT_DIR/$CERT_NAME"
    sudo trust extract-compat
    echo -e "${GREEN}✅ Added to system trust store${NC}"
else
    echo -e "${YELLOW}⚠️  System trust store not found, skipping system-wide trust${NC}"
fi

# Add certificate to Firefox profiles
echo -e "${BLUE}🦊 Adding certificate to Firefox profiles...${NC}"
FIREFOX_PROFILES_DIR="$HOME/.mozilla/firefox"

if [ -d "$FIREFOX_PROFILES_DIR" ]; then
    FOUND_FIREFOX_PROFILE=false
    
    for profile_dir in "$FIREFOX_PROFILES_DIR"/*.default* "$FIREFOX_PROFILES_DIR"/*-release; do
        if [ -d "$profile_dir" ]; then
            FOUND_FIREFOX_PROFILE=true
            profile_name=$(basename "$profile_dir")
            echo "  📁 Processing Firefox profile: $profile_name"
            
            # Add certificate to Firefox's certificate database
            certutil -A -n "Vite Dev Certificate" -t "TCu,Cu,Tu" -i "$CERT_FILE" -d sql:"$profile_dir" 2>/dev/null || {
                echo -e "${YELLOW}    ⚠️  Could not add to Firefox profile $profile_name (database may not exist)${NC}"
            }
        fi
    done
    
    if $FOUND_FIREFOX_PROFILE; then
        echo -e "${GREEN}✅ Processed Firefox profiles${NC}"
    else
        echo -e "${YELLOW}⚠️  No Firefox profiles found${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Firefox not found${NC}"
fi

# Add certificate to Chrome/Chromium
echo -e "${BLUE}🌐 Adding certificate to Chrome/Chromium...${NC}"

# Chrome/Chromium certificate database
CHROME_CERT_DB="$HOME/.pki/nssdb"

if [ -d "$CHROME_CERT_DB" ]; then
    certutil -A -n "Vite Dev Certificate" -t "TCu,Cu,Tu" -i "$CERT_FILE" -d sql:"$CHROME_CERT_DB" 2>/dev/null || {
        echo -e "${YELLOW}⚠️  Could not add to Chrome certificate database${NC}"
    }
    echo -e "${GREEN}✅ Added to Chrome/Chromium certificate store${NC}"
else
    echo -e "${YELLOW}⚠️  Chrome/Chromium certificate database not found${NC}"
    echo "You may need to start Chrome/Chromium first to create the database"
fi

# Display final instructions
echo ""
echo -e "${GREEN}🎉 Certificate trust setup completed!${NC}"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo "1. Restart any open Chrome/Chromium and Firefox browsers"
echo "2. Start your Vite development server: npm run dev"
echo "3. Visit https://localhost:5173"
echo "4. The certificate should now be trusted automatically"
echo ""
echo -e "${YELLOW}💡 Note:${NC}"
echo "- If you still see certificate warnings, try clearing browser cache"
echo "- You may need to restart your browsers completely"
echo "- This certificate is only valid for localhost development"
echo ""
echo -e "${BLUE}🔧 To remove the certificate later:${NC}"
echo "sudo rm $SYSTEM_CERT_DIR/$CERT_NAME 2>/dev/null || true"
echo "sudo trust extract-compat"
echo "certutil -D -n 'Vite Dev Certificate' -d sql:$CHROME_CERT_DB 2>/dev/null || true"
echo ""
echo -e "${GREEN}✨ Happy coding with trusted HTTPS! ✨${NC}"