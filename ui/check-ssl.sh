#!/bin/bash

# Check if SSL certificates exist and are valid
# This script runs before starting the dev server

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

VITE_CERT_DIR="$HOME/.vite-plugin-basic-ssl"
CERT_FILE="$VITE_CERT_DIR/cert.pem"
KEY_FILE="$VITE_CERT_DIR/key.pem"

ROOT_CA_CERT="$HOME/.vite-plugin-basic-ssl/rootCA.pem"

regenerate() {
        echo -e "${BLUE}🔒 (Re)generating and trusting dev certificates...${NC}"
        chmod +x trust-dev-certs.sh
        ./trust-dev-certs.sh
        echo ""
        echo -e "${GREEN}✅ SSL setup completed!${NC}"
        echo -e "${YELLOW}⚠️  IMPORTANT: Please restart your browser completely before accessing the app${NC}"
        echo ""
}

needs_regen=false

if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
    echo -e "${YELLOW}⚠️  Dev certificate/key missing${NC}"
    needs_regen=true
fi

# If openssl present perform deeper checks
if command -v openssl >/dev/null 2>&1 && [ "$needs_regen" = false ]; then
    # Expiration check (< 10 days triggers regen)
    end_raw=$(openssl x509 -in "$CERT_FILE" -noout -enddate 2>/dev/null | cut -d= -f2 || true)
    if [ -n "$end_raw" ]; then
        end_epoch=$(date -d "$end_raw" +%s 2>/dev/null || echo 0)
        now_epoch=$(date +%s)
        if [ "$end_epoch" -eq 0 ] || [ $(( (end_epoch-now_epoch)/86400 )) -lt 10 ]; then
            echo -e "${YELLOW}⚠️  Dev certificate expiring soon or unreadable (${end_raw:-unknown})${NC}"
            needs_regen=true
        fi
    fi

    # SAN presence
    san=$(openssl x509 -in "$CERT_FILE" -noout -text 2>/dev/null | grep -A1 "Subject Alternative Name" | tail -1 | tr -d ' ' || true)
    if ! echo "$san" | grep -q "localhost" || ! echo "$san" | grep -q "127.0.0.1"; then
        echo -e "${YELLOW}⚠️  Missing required SAN entries (found: $san)${NC}"
        needs_regen=true
    fi

    # Key usage must include Digital Signature
        ku=$(openssl x509 -in "$CERT_FILE" -noout -text 2>/dev/null | grep -A1 "Key Usage" | tail -1 | xargs || true)
        if ! echo "$ku" | grep -q "Digital Signature"; then
            echo -e "${YELLOW}⚠️  Key Usage missing Digital Signature (current: $ku)${NC}"
            needs_regen=true
        fi
fi

if [ "$needs_regen" = true ]; then
    regenerate
    exit 0
fi

# Quick root CA presence note (non-fatal if using mkcert path)
if [ -f "$ROOT_CA_CERT" ]; then
    echo -e "${GREEN}✅ Dev certificate valid (root CA present)${NC}"
else
    echo -e "${GREEN}✅ Dev certificate valid${NC} (root CA file not found; may be managed by mkcert)"
fi

