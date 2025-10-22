# Shell Script Fixes for Ubuntu Server

## Issues Fixed

### 1. **BOM (Byte Order Mark) Issue**
**Problem:** The shell scripts had a UTF-8 BOM at the beginning, causing the error:
```
./trust-certificate.sh: line 1: ﻿#!/bin/bash: No such file or directory
```

**Solution:** Removed BOM from all shell scripts using `fix-script-encoding.ps1`

### 2. **Package Manager Detection**
**Problem:** Script was hardcoded to use `pacman` (Arch Linux package manager), causing:
```
./trust-certificate.sh: line 70: pacman: command not found
```

**Solution:** Added automatic Linux distribution detection supporting:
- **Ubuntu/Debian**: Uses `apt-get` and `/usr/local/share/ca-certificates`
- **Arch Linux**: Uses `pacman` and `/etc/ca-certificates/trust-source/anchors`
- **CentOS/RHEL/Fedora**: Uses `yum` and `/etc/pki/ca-trust/source/anchors`

### 3. **Certificate Trust Update Commands**
**Problem:** Script used only `trust extract-compat` (Arch Linux specific)

**Solution:** Added distribution-specific commands:
- **Ubuntu/Debian**: `update-ca-certificates`
- **Arch Linux**: `trust extract-compat`
- **CentOS/RHEL/Fedora**: `update-ca-trust`

### 4. **Line Endings**
**Problem:** Scripts had Windows line endings (CRLF) instead of Unix line endings (LF)

**Solution:** Converted all shell scripts to use LF line endings

## Files Fixed

1. ✅ `trust-certificate.sh` - Certificate trust installation script
2. ✅ `create-certificates.sh` - Certificate generation script
3. ✅ `install.sh` - Installation script
4. ✅ `manager.sh` - Management script

## Usage on Ubuntu Server

Now you can run the scripts without issues:

```bash
# Generate certificates
./create-certificates.sh

# Trust the certificate
sudo ./trust-certificate.sh

# Install the API
sudo ./install.sh

# Manage the service
sudo ./manager.sh
```

## New Tool: fix-script-encoding.ps1

A PowerShell utility was created to fix encoding and line ending issues for shell scripts:

```powershell
.\fix-script-encoding.ps1 -FilePath "path\to\script.sh"
```

This tool:
- Removes UTF-8 BOM
- Converts CRLF to LF
- Maintains UTF-8 encoding

## Distribution Detection Details

The `trust-certificate.sh` script now detects the Linux distribution using `/etc/os-release` and automatically:
- Selects the correct package manager
- Uses the appropriate certificate directory
- Runs the correct certificate trust update command

Supported distributions:
- Ubuntu, Debian
- Arch Linux, EndeavourOS, Manjaro
- CentOS, RHEL, Fedora, Rocky Linux, AlmaLinux

## Testing

To verify the fixes work correctly on Ubuntu:

```bash
# Check script has correct line endings
file trust-certificate.sh
# Should output: "trust-certificate.sh: Bourne-Again shell script, UTF-8 Unicode text executable"

# Run the script
sudo ./trust-certificate.sh
```

## Notes

- All scripts now have proper Unix line endings (LF)
- All scripts are encoded as UTF-8 without BOM
- Distribution detection is automatic
- Scripts gracefully handle unknown distributions by defaulting to Debian/Ubuntu behavior
