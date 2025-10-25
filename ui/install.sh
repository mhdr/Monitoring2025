#!/usr/bin/env bash

set -e  # Exit on error

deploy_dir=/var/www/ems3/ui
nginx_config_source=ems3_ui.nginx
nginx_config_dest=/etc/nginx/sites-available/ems3_ui
nginx_config_link=/etc/nginx/sites-enabled/ems3_ui

echo "========================================"
echo "EMS3 UI Deployment Script"
echo "========================================"

# Check if nginx is installed
if ! command -v nginx &> /dev/null; then
    echo "Nginx is not installed. Installing nginx..."
    sudo apt-get update
    sudo apt-get install -y nginx
    echo "Nginx installed successfully"
else
    echo "Nginx is already installed"
fi

# Ensure nginx is enabled and running
sudo systemctl enable nginx
sudo systemctl start nginx || true
echo "Nginx service is enabled and running"

# Build the React app
echo ""
echo "Building React app..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "Build failed!"
    exit 1
fi

if [ ! -d "dist" ]; then
    echo "Error: dist directory not found after build!"
    exit 1
fi

echo "Build completed successfully"

# Deploy
echo ""
echo "Deploying to ${deploy_dir}..."
sudo mkdir -p ${deploy_dir}

# Safety check to prevent accidental deletion
if [ -z "$deploy_dir" ] || [ "$deploy_dir" = "/" ]; then
    echo "Error: Invalid deploy directory"
    exit 1
fi

# Backup existing deployment if it exists
if [ -d "${deploy_dir}" ] && [ "$(ls -A ${deploy_dir})" ]; then
    backup_dir="${deploy_dir}.backup.$(date +%Y%m%d_%H%M%S)"
    echo "Backing up existing deployment to ${backup_dir}"
    sudo cp -r ${deploy_dir} ${backup_dir}
fi

# Remove existing contents and deploy new build
sudo rm -rf "${deploy_dir:?}"/*
sudo cp -r dist/* "${deploy_dir}"/

# Set appropriate permissions
sudo chown -R www-data:www-data ${deploy_dir}
sudo chmod -R 755 ${deploy_dir}

echo "Files deployed successfully to ${deploy_dir}"

# Nginx configuration
echo ""
echo "Configuring nginx..."

if [ ! -f "${nginx_config_source}" ]; then
    echo "Error: ${nginx_config_source} not found!"
    exit 1
fi

# Copy nginx configuration
sudo cp ${nginx_config_source} ${nginx_config_dest}
echo "Nginx configuration copied to ${nginx_config_dest}"

# Create symbolic link if it doesn't exist
if [ ! -L "${nginx_config_link}" ]; then
    sudo ln -s ${nginx_config_dest} ${nginx_config_link}
    echo "Created nginx site link: ${nginx_config_link}"
else
    echo "Nginx site link already exists"
fi

# Remove default nginx site if it exists and is enabled
if [ -L "/etc/nginx/sites-enabled/default" ]; then
    echo "Disabling default nginx site..."
    sudo rm /etc/nginx/sites-enabled/default
fi

# Test nginx configuration
echo ""
echo "Testing nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    # Reload nginx to apply changes
    echo "Reloading nginx..."
    sudo systemctl reload nginx
    echo ""
    echo "========================================"
    echo "Deployment completed successfully!"
    echo "========================================"
    echo ""
    echo "UI is now accessible at:"
    echo "  - http://localhost"
    echo "  - http://$(hostname -I | awk '{print $1}')"
    echo ""
    echo "Nginx logs:"
    echo "  - Access: /var/log/nginx/ems3_ui_access.log"
    echo "  - Error: /var/log/nginx/ems3_ui_error.log"
    echo ""
else
    echo "========================================"
    echo "Error: Nginx configuration test failed!"
    echo "========================================"
    echo "Please check the configuration and try again."
    exit 1
fi

