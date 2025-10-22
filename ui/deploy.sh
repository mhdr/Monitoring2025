#!/bin/bash

# Build the React app
echo "Building React app..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "Build failed!"
    exit 1
fi

# Define target directory
TARGET_DIR="/home/mahmood/git/Monitoring2025/ui-server/public"

# Safety check to prevent accidental deletion
if [ -z "$TARGET_DIR" ] || [ "$TARGET_DIR" = "/" ]; then
    echo "Error: Invalid target directory"
    exit 1
fi

# Create target directory if it doesn't exist
mkdir -p "$TARGET_DIR"

# Remove existing contents of target directory
rm -rf "${TARGET_DIR:?}"/*

# Copy built files to target directory
echo "Deploying to $TARGET_DIR..."
cp -r dist/* "$TARGET_DIR"/

echo "Deployment completed successfully!"

