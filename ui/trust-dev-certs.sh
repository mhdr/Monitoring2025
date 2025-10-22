#!/bin/bash

# Trust Development SSL Certificates for Chrome and Firefox on Linux
# This script now prefers a LOCAL DEVELOPMENT ROOT CA (mkcert if available, otherwise custom) to sign the localhost cert.
# Browsers (especially Chrome) are less happy with a raw self‑signed leaf certificate lacking CA basicConstraints.
# Strategy:
#  1. If mkcert exists: use it (simplest, robust, auto‑trusts root)
#  2. Else create a lightweight root CA (10 years) + sign a leaf cert (825 days ~ Chrome cap) with proper SANs
#  3. Install (trust) ONLY the root CA in system & NSS stores; browsers validate the signed leaf w/o warnings
#  4. Recreate certificates when SANs missing or expiring soon (<15 days)

set -euo pipefail

echo "🔐 Development SSL Certificate Trust Setup"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running as root - warn but allow
if [[ $EUID -eq 0 ]]; then
   echo -e "${YELLOW}⚠️  Running as root - certificates will be installed in root's home directory${NC}"
   echo "If you want per-user certificates, run as a regular user instead"
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Detect Linux distribution
detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo "$ID"
    elif [ -f /etc/arch-release ]; then
        echo "arch"
    elif [ -f /etc/debian_version ]; then
        echo "debian"
    elif [ -f /etc/fedora-release ]; then
        echo "fedora"
    else
        echo "unknown"
    fi
}

DISTRO=$(detect_distro)

# Install required packages if not present
echo -e "${BLUE}📦 Checking required packages...${NC}"

PACKAGES_TO_INSTALL=()

if ! command_exists openssl; then
    PACKAGES_TO_INSTALL+=("openssl")
fi

if ! command_exists certutil; then
    case "$DISTRO" in
        arch|endeavouros|manjaro)
            PACKAGES_TO_INSTALL+=("nss")
            ;;
        ubuntu|debian|pop|linuxmint)
            PACKAGES_TO_INSTALL+=("libnss3-tools")
            ;;
        fedora|rhel|centos)
            PACKAGES_TO_INSTALL+=("nss-tools")
            ;;
        *)
            PACKAGES_TO_INSTALL+=("nss-tools")
            ;;
    esac
fi

if [ ${#PACKAGES_TO_INSTALL[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Installing required packages: ${PACKAGES_TO_INSTALL[*]}${NC}"
    echo "You may be prompted for your sudo password..."
    
    case "$DISTRO" in
        arch|endeavouros|manjaro)
            sudo pacman -S --needed "${PACKAGES_TO_INSTALL[@]}"
            ;;
        ubuntu|debian|pop|linuxmint)
            sudo apt-get update && sudo apt-get install -y "${PACKAGES_TO_INSTALL[@]}"
            ;;
        fedora|rhel|centos)
            sudo dnf install -y "${PACKAGES_TO_INSTALL[@]}"
            ;;
        *)
            echo -e "${RED}❌ Unsupported distribution: $DISTRO${NC}"
            echo "Please install the following packages manually: ${PACKAGES_TO_INSTALL[*]}"
            exit 1
            ;;
    esac
fi

VITE_CERT_DIR="$HOME/.vite-plugin-basic-ssl"
mkdir -p "$VITE_CERT_DIR"

# Paths
CERT_FILE="$VITE_CERT_DIR/cert.pem"            # Leaf cert
KEY_FILE="$VITE_CERT_DIR/key.pem"              # Leaf key
ROOT_CA_KEY="$VITE_CERT_DIR/rootCA-key.pem"    # Root CA key (custom case)
ROOT_CA_CERT="$VITE_CERT_DIR/rootCA.pem"       # Root CA cert
ROOT_CA_NAME="Monitoring Dev Local CA"

# Helper: expiry days remaining for a cert (returns integer or 0)
days_remaining() {
    local file=$1
    if [ ! -f "$file" ]; then echo 0; return; fi
    local raw epoch_now epoch_end
    raw=$(openssl x509 -in "$file" -noout -enddate 2>/dev/null | cut -d= -f2 || echo "")
    if [ -z "$raw" ]; then echo 0; return; fi
    epoch_now=$(date +%s)
    epoch_end=$(date -d "$raw" +%s 2>/dev/null || echo 0)
    if [ "$epoch_end" = 0 ]; then echo 0; return; fi
    echo $(( (epoch_end-epoch_now)/86400 ))
}

# Decide path: prefer mkcert
MKCERT_MODE=false
if command -v mkcert >/dev/null 2>&1; then
    MKCERT_MODE=true
    echo -e "${BLUE}🛠 Using mkcert for certificate generation...${NC}"
    # If cert missing or expiring soon (<15 days) regenerate
    rem=$(days_remaining "$CERT_FILE")
    if [ ! -f "$CERT_FILE" ] || [ "$rem" -lt 15 ]; then
        echo -e "${BLUE}🔧 Generating (or refreshing) mkcert localhost certificate...${NC}"
        (cd "$VITE_CERT_DIR" && mkcert -install >/dev/null 2>&1 || true)
        mkcert -key-file "$KEY_FILE" -cert-file "$CERT_FILE" localhost 127.0.0.1 ::1 >/dev/null
        echo -e "${GREEN}✅ mkcert certificate ready (expires in $(days_remaining "$CERT_FILE") days)${NC}"
    else
        echo -e "${GREEN}✅ Existing mkcert certificate valid for $rem more days${NC}"
    fi
    ROOT_CA_CERT=$(mkcert -CAROOT 2>/dev/null)/rootCA.pem
    # Extract the actual CA name from mkcert root certificate
    if [ -f "$ROOT_CA_CERT" ]; then
        ROOT_CA_NAME=$(openssl x509 -in "$ROOT_CA_CERT" -noout -subject | sed 's/.*CN=\(.*\)/\1/')
    fi
else
    echo -e "${YELLOW}ℹ️  mkcert not found – falling back to custom root CA generation${NC}"
    # Generate root CA if missing or expiring soon (<30 days)
    ca_rem=$(days_remaining "$ROOT_CA_CERT")
    if [ ! -f "$ROOT_CA_CERT" ] || [ "$ca_rem" -lt 30 ]; then
        echo -e "${BLUE}🔧 Creating local root CA (${ROOT_CA_NAME})...${NC}"
        openssl genrsa -out "$ROOT_CA_KEY" 4096 >/dev/null 2>&1
        cat > "$VITE_CERT_DIR/rootCA.cnf" << EOF
[ req ]
distinguished_name = dn
prompt = no
x509_extensions = v3_ca

[ dn ]
CN = ${ROOT_CA_NAME}
O = Local Dev
C = XX

[ v3_ca ]
basicConstraints = critical, CA:TRUE, pathlen:0
keyUsage = critical, keyCertSign, cRLSign
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer:always
EOF
        openssl req -x509 -new -nodes -key "$ROOT_CA_KEY" -sha256 -days 3650 \
            -out "$ROOT_CA_CERT" -config "$VITE_CERT_DIR/rootCA.cnf" >/dev/null 2>&1
        rm -f "$VITE_CERT_DIR/rootCA.cnf" "$VITE_CERT_DIR/rootCA.srl"
        echo -e "${GREEN}✅ Root CA created (expires in $(days_remaining "$ROOT_CA_CERT") days)${NC}"
    else
        echo -e "${GREEN}✅ Root CA valid for $ca_rem more days${NC}"
    fi
    # Generate / refresh leaf cert
    leaf_rem=$(days_remaining "$CERT_FILE")
    if [ ! -f "$CERT_FILE" ] || [ "$leaf_rem" -lt 15 ]; then
        echo -e "${BLUE}🔧 Generating leaf localhost certificate signed by root CA...${NC}"
        openssl genrsa -out "$KEY_FILE" 2048 >/dev/null 2>&1
        cat > "$VITE_CERT_DIR/cert.conf" << EOF
[ req ]
distinguished_name = dn
prompt = no
req_extensions = v3_req

[ dn ]
CN = localhost

[ v3_req ]
basicConstraints = CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid,issuer

[ alt_names ]
DNS.1 = localhost
DNS.2 = 127.0.0.1
IP.1 = 127.0.0.1
IP.2 = ::1
EOF
        openssl req -new -key "$KEY_FILE" -out "$VITE_CERT_DIR/cert.csr" -config "$VITE_CERT_DIR/cert.conf" >/dev/null 2>&1
        openssl x509 -req -in "$VITE_CERT_DIR/cert.csr" -CA "$ROOT_CA_CERT" -CAkey "$ROOT_CA_KEY" -CAcreateserial \
            -out "$CERT_FILE" -days 825 -sha256 -extensions v3_req -extfile "$VITE_CERT_DIR/cert.conf" >/dev/null 2>&1
        rm -f "$VITE_CERT_DIR/cert.csr" "$VITE_CERT_DIR/cert.conf" "$VITE_CERT_DIR/rootCA.srl"
        echo -e "${GREEN}✅ Leaf certificate generated (expires in $(days_remaining "$CERT_FILE") days)${NC}"
    else
        echo -e "${GREEN}✅ Leaf certificate valid for $leaf_rem more days${NC}"
    fi
fi

# Determine which CA file to trust (mkcert already installs globally, but we still add to per-user NSS if needed)
if [ ! -f "$ROOT_CA_CERT" ]; then
    if [ "$MKCERT_MODE" = true ]; then
        echo -e "${YELLOW}⚠️  mkcert root CA not located (expected: $(mkcert -CAROOT)/rootCA.pem). Attempting mkcert -install...${NC}"
        (cd "$VITE_CERT_DIR" && mkcert -install >/dev/null 2>&1 || true)
        if [ -f "$(mkcert -CAROOT)/rootCA.pem" ]; then
            ROOT_CA_CERT="$(mkcert -CAROOT)/rootCA.pem"
            echo -e "${GREEN}✅ mkcert root CA installed${NC}"
        else
            echo -e "${YELLOW}⚠️  Still no mkcert root CA; will fallback to trusting leaf (browser may warn).${NC}"
            ROOT_CA_CERT="$CERT_FILE"
        fi
    else
        # If custom mode but somehow missing, fallback to leaf (should not happen)
        ROOT_CA_CERT="$CERT_FILE"
        echo -e "${YELLOW}⚠️  Root CA certificate not found; falling back to trusting leaf certificate (Chrome may warn).${NC}"
    fi
fi

# Add CA certificate to system trust store if we created our own (skip if mkcert handled system) unless it's already there
CA_TARGET_NAME="monitoring-dev-root-ca.crt"
if [ "$MKCERT_MODE" = false ]; then
    echo -e "${BLUE}🔒 Adding local root CA to system trust store...${NC}"
    
    case "$DISTRO" in
        arch|endeavouros|manjaro)
            SYSTEM_CERT_DIR="/etc/ca-certificates/trust-source/anchors"
            if [ -d "$SYSTEM_CERT_DIR" ]; then
                sudo cp "$ROOT_CA_CERT" "$SYSTEM_CERT_DIR/$CA_TARGET_NAME" 2>/dev/null || true
                sudo trust extract-compat 2>/dev/null || true
                echo -e "${GREEN}✅ Root CA added to system trust store (Arch-based)${NC}"
            fi
            ;;
        ubuntu|debian|pop|linuxmint)
            SYSTEM_CERT_DIR="/usr/local/share/ca-certificates"
            if [ -d "$SYSTEM_CERT_DIR" ]; then
                sudo cp "$ROOT_CA_CERT" "$SYSTEM_CERT_DIR/$CA_TARGET_NAME" 2>/dev/null || true
                sudo update-ca-certificates 2>/dev/null || true
                echo -e "${GREEN}✅ Root CA added to system trust store (Debian-based)${NC}"
            fi
            ;;
        fedora|rhel|centos)
            SYSTEM_CERT_DIR="/etc/pki/ca-trust/source/anchors"
            if [ -d "$SYSTEM_CERT_DIR" ]; then
                sudo cp "$ROOT_CA_CERT" "$SYSTEM_CERT_DIR/$CA_TARGET_NAME" 2>/dev/null || true
                sudo update-ca-trust 2>/dev/null || true
                echo -e "${GREEN}✅ Root CA added to system trust store (Fedora-based)${NC}"
            fi
            ;;
        *)
            echo -e "${YELLOW}⚠️  Unknown distribution, skipping system trust store${NC}"
            ;;
    esac
fi

# Add CA certificate to Firefox profiles (mkcert usually handles; we ensure fallback)
echo -e "${BLUE}🦊 Adding certificate authority to Firefox profiles...${NC}"
FIREFOX_PROFILES_DIR="$HOME/.mozilla/firefox"

if [ -d "$FIREFOX_PROFILES_DIR" ]; then
    FOUND_FIREFOX_PROFILE=false
    
    for profile_dir in "$FIREFOX_PROFILES_DIR"/*.default* "$FIREFOX_PROFILES_DIR"/*-release; do
        if [ -d "$profile_dir" ]; then
            FOUND_FIREFOX_PROFILE=true
            profile_name=$(basename "$profile_dir")
            echo "  📁 Processing Firefox profile: $profile_name"
            
            # Add root CA certificate to Firefox's certificate database
            certutil -D -n "$ROOT_CA_NAME" -d sql:"$profile_dir" 2>/dev/null || true
            certutil -A -n "$ROOT_CA_NAME" -t "C,C,C" -i "$ROOT_CA_CERT" -d sql:"$profile_dir" 2>/dev/null || {
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

# Add CA certificate to Chrome/Chromium and other Chromium-based browsers
echo -e "${BLUE}🌐 Adding certificate authority to Chrome/Chromium-based browsers...${NC}"

# Chrome/Chromium certificate database (shared by Chrome, Chromium, Brave, Edge, etc.)
CHROME_CERT_DB="$HOME/.pki/nssdb"

if [ -d "$CHROME_CERT_DB" ]; then
    # Remove old certificate with wrong name if exists
    certutil -D -n "Monitoring Dev Local CA" -d sql:"$CHROME_CERT_DB" 2>/dev/null || true
    # Remove existing certificate with same name (to update it)
    certutil -D -n "$ROOT_CA_NAME" -d sql:"$CHROME_CERT_DB" 2>/dev/null || true
    # Add the root CA
    certutil -A -n "$ROOT_CA_NAME" -t "C,C,C" -i "$ROOT_CA_CERT" -d sql:"$CHROME_CERT_DB" 2>/dev/null || {
        echo -e "${YELLOW}⚠️  Could not add root CA to Chrome certificate database${NC}"
    }
    echo -e "${GREEN}✅ Root CA added to Chrome/Chromium certificate store${NC}"
    echo -e "${GREEN}   (Also applies to Brave, Edge, and other Chromium-based browsers)${NC}"
else
    echo -e "${YELLOW}⚠️  Chrome/Chromium certificate database not found${NC}"
    echo "You may need to start Chrome/Chromium first to create the database"
fi

# Display final instructions
echo ""
echo -e "${GREEN}🎉 Certificate trust setup completed!${NC}"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo "1. Restart any open Chrome/Chromium and Firefox browsers (fully close all windows)"
echo "2. Start your Vite development server: npm run dev"
echo "3. Visit https://localhost:5173 (Chrome should now show a secure lock)"
echo ""
echo -e "${YELLOW}💡 For Chrome/Chromium users:${NC}"
echo "If you still see 'NET::ERR_CERT_INVALID':"
echo " - Ensure the root CA appears in chrome://settings/security → Manage certificates (Authorities) as '${ROOT_CA_NAME}'"
echo " - Clear SSL state: chrome://net-internals/#events → (or Settings > Privacy > Clear browsing data > Cached images & files)"
if [ "$MKCERT_MODE" = true ]; then
echo " - Confirm chain: openssl verify -CAfile $(mkcert -CAROOT)/rootCA.pem $CERT_FILE"
else
echo " - Confirm chain: openssl verify -CAfile $ROOT_CA_CERT $CERT_FILE"
fi
echo ""
echo -e "${YELLOW}💡 General Notes:${NC}"
echo "- Firefox should trust the certificate automatically"
echo "- Chrome on Linux has stricter certificate validation for localhost"
echo "- The certificate is system-trusted but Chrome may still show warnings for self-signed certs"
echo "- This certificate is only valid for localhost development"
echo ""
echo -e "${BLUE}🔧 To remove the certificate later:${NC}"
if [ "$MKCERT_MODE" = true ]; then
    echo "# mkcert root removal (not usually recommended):"
    echo "rm -rf $(mkcert -CAROOT)"
else
    case "$DISTRO" in
        arch|endeavouros|manjaro)
            echo "sudo rm /etc/ca-certificates/trust-source/anchors/monitoring-dev-root-ca.crt 2>/dev/null || true"
            echo "sudo trust extract-compat"
            ;;
        ubuntu|debian|pop|linuxmint)
            echo "sudo rm /usr/local/share/ca-certificates/monitoring-dev-root-ca.crt 2>/dev/null || true"
            echo "sudo update-ca-certificates"
            ;;
        fedora|rhel|centos)
            echo "sudo rm /etc/pki/ca-trust/source/anchors/monitoring-dev-root-ca.crt 2>/dev/null || true"
            echo "sudo update-ca-trust"
            ;;
        *)
            echo "# Remove certificate based on your distribution"
            ;;
    esac
fi
echo "certutil -D -n '${ROOT_CA_NAME}' -d sql:$CHROME_CERT_DB 2>/dev/null || true"
echo ""
echo -e "${GREEN}✨ Happy coding with trusted HTTPS! ✨${NC}"