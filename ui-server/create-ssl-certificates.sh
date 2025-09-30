#!/bin/bash

# SSL Certificate Generation Script for UI Server
# This script creates self-signed SSL certificates for local development

set -e

CERT_DIR="./certificates"
DAYS_VALID=365

echo "Creating SSL certificates for UI Server..."

# Create certificates directory if it doesn't exist
mkdir -p "$CERT_DIR"

# Generate private key
echo "Generating private key..."
openssl genrsa -out "$CERT_DIR/ui-server-key.pem" 2048

# Generate certificate signing request (CSR)
echo "Generating certificate signing request..."
openssl req -new -key "$CERT_DIR/ui-server-key.pem" \
    -out "$CERT_DIR/ui-server-csr.pem" \
    -subj "/C=US/ST=State/L=City/O=Organization/OU=Development/CN=localhost"

# Generate self-signed certificate
echo "Generating self-signed certificate..."
openssl x509 -req -days $DAYS_VALID \
    -in "$CERT_DIR/ui-server-csr.pem" \
    -signkey "$CERT_DIR/ui-server-key.pem" \
    -out "$CERT_DIR/ui-server-cert.pem" \
    -extfile <(printf "subjectAltName=DNS:localhost,IP:127.0.0.1")

# Clean up CSR
rm "$CERT_DIR/ui-server-csr.pem"

echo "SSL certificates created successfully!"
echo "Certificate: $CERT_DIR/ui-server-cert.pem"
echo "Private Key: $CERT_DIR/ui-server-key.pem"
echo ""
echo "Note: These are self-signed certificates for development only."
echo "Browsers will show a security warning. You can trust the certificate manually."
