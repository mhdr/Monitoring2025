#!/bin/bash

# EMS API Startup Script
# This script demonstrates how to set up and run the EMS API with SSL certificates

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== EMS API Development Startup ===${NC}\n"

# Check if we're in the right directory
if [ ! -f "API.csproj" ]; then
    echo -e "${RED}Error: Please run this script from the API project directory${NC}"
    echo -e "Expected files: API.csproj, Program.cs, appsettings.json"
    exit 1
fi

# Check if certificates exist
if [ ! -d "certificates" ] || [ ! -f "certificates/api-cert.pfx" ]; then
    echo -e "${YELLOW}SSL certificates not found. Generating them now...${NC}"
    ./create-certificates.sh
    echo -e "\n${GREEN}Certificates created successfully!${NC}\n"
else
    echo -e "${GREEN}✓ SSL certificates found${NC}"
fi

# Build the application
echo -e "${YELLOW}Building the application...${NC}"
dotnet build
if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed. Please fix the errors and try again.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Build successful${NC}"

echo -e "\n${BLUE}Available run options:${NC}"
echo -e "  1) HTTPS only (recommended for development)"
echo -e "  2) HTTP only (not recommended)"
echo -e "  3) Both HTTP and HTTPS (with redirection)"

read -p "Choose an option (1-3): " -n 1 -r
echo

case $REPLY in
    1)
        echo -e "\n${GREEN}Starting application with HTTPS only...${NC}"
        echo -e "${YELLOW}Access your application at:${NC}"
        echo -e "  🌐 https://localhost:7136"
        echo -e "  📚 Swagger: https://localhost:7136/swagger"
        echo -e "\n${YELLOW}Note: Your browser will show a security warning for self-signed certificates.${NC}"
        echo -e "Click 'Advanced' → 'Proceed to localhost' to continue.\n"
        dotnet run --launch-profile https
        ;;
    2)
        echo -e "\n${YELLOW}Starting application with HTTP only...${NC}"
        echo -e "${YELLOW}Access your application at:${NC}"
        echo -e "  🌐 http://localhost:5030"
        echo -e "  📚 Swagger: http://localhost:5030/swagger"
        echo -e "\n${RED}Warning: HTTP is not secure for production use!${NC}\n"
        dotnet run --launch-profile http
        ;;
    3)
        echo -e "\n${GREEN}Starting application with both HTTP and HTTPS...${NC}"
        echo -e "${YELLOW}Access your application at:${NC}"
        echo -e "  🌐 https://localhost:7136 (primary)"
        echo -e "  🌐 http://localhost:5030 (redirects to HTTPS)"
        echo -e "  📚 Swagger: https://localhost:7136/swagger"
        echo -e "\n${YELLOW}HTTP requests will automatically redirect to HTTPS${NC}\n"
        dotnet run --launch-profile https
        ;;
    *)
        echo -e "\n${RED}Invalid option. Defaulting to HTTPS...${NC}\n"
        dotnet run --launch-profile https
        ;;
esac