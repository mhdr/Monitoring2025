@echo off
setlocal enabledelayedexpansion

REM SSL Certificate Generation Script for EMS API (Windows Batch)
REM This script creates self-signed SSL certificates for development use

echo.
echo === EMS API SSL Certificate Generator ===
echo This script will create self-signed SSL certificates for development use.
echo.

REM Configuration
set CERT_DIR=certificates
set CERT_NAME=api-cert
set KEY_NAME=api-key
set PFX_NAME=api-cert
set CERT_PASSWORD=password123
set DAYS_VALID=365

REM Certificate subject information
set COUNTRY=US
set STATE=State
set LOCALITY=City
set ORGANIZATION=EMS Monitoring
set ORG_UNIT=Development
set COMMON_NAME=localhost

REM Check if OpenSSL is available
set OPENSSL_PATH=
for %%p in (
    "openssl"
    "C:\Program Files\OpenSSL-Win64\bin\openssl.exe"
    "C:\Program Files (x86)\OpenSSL-Win32\bin\openssl.exe"
    "C:\OpenSSL\bin\openssl.exe"
    "C:\tools\openssl\openssl.exe"
) do (
    %%~p version >nul 2>&1
    if !errorlevel! equ 0 (
        set OPENSSL_PATH=%%~p
        goto :openssl_found
    )
)

echo Error: OpenSSL is not installed or not found in PATH.
echo Please install OpenSSL from one of these sources:
echo   1. Win64/Win32 OpenSSL: https://slproweb.com/products/Win32OpenSSL.html
echo   2. Chocolatey: choco install openssl
echo   3. Scoop: scoop install openssl
echo   4. Git for Windows (includes OpenSSL)
pause
exit /b 1

:openssl_found
echo ✓ OpenSSL found at: !OPENSSL_PATH!

REM Create certificates directory if it doesn't exist
if not exist "%CERT_DIR%" (
    echo Creating certificates directory...
    mkdir "%CERT_DIR%"
)

cd "%CERT_DIR%"

REM Check if certificates already exist
if exist "%CERT_NAME%.pem" if exist "%KEY_NAME%.pem" if exist "%PFX_NAME%.pfx" (
    echo SSL certificates already exist.
    set /p "response=Do you want to regenerate them? (y/N): "
    
    if /i not "!response!"=="y" if /i not "!response!"=="yes" (
        echo Using existing certificates.
        cd ..
        pause
        exit /b 0
    )
    
    echo Removing existing certificates...
    del /q "%CERT_NAME%.pem" "%KEY_NAME%.pem" "%PFX_NAME%.pfx" 2>nul
)

echo Generating SSL certificate and private key...

REM Build the subject string
set SUBJECT=/C=%COUNTRY%/ST=%STATE%/L=%LOCALITY%/O=%ORGANIZATION%/OU=%ORG_UNIT%/CN=%COMMON_NAME%

REM Generate private key and certificate in one command
!OPENSSL_PATH! req -x509 -newkey rsa:4096 ^
    -keyout "%KEY_NAME%.pem" ^
    -out "%CERT_NAME%.pem" ^
    -days %DAYS_VALID% ^
    -nodes ^
    -subj "%SUBJECT%"

if !errorlevel! equ 0 (
    echo ✓ Certificate and private key generated successfully
) else (
    echo ✗ Failed to generate certificate and private key
    cd ..
    pause
    exit /b 1
)

echo Converting certificate to PKCS#12 format (.pfx)...

REM Convert to PKCS#12 format for .NET
!OPENSSL_PATH! pkcs12 -export ^
    -out "%PFX_NAME%.pfx" ^
    -inkey "%KEY_NAME%.pem" ^
    -in "%CERT_NAME%.pem" ^
    -passout pass:%CERT_PASSWORD%

if !errorlevel! equ 0 (
    echo ✓ PKCS#12 certificate generated successfully
) else (
    echo ✗ Failed to generate PKCS#12 certificate
    cd ..
    pause
    exit /b 1
)

echo.
echo === Certificate Generation Complete ===
echo Generated files:
echo   📄 %CERT_NAME%.pem     - Certificate file
echo   🔐 %KEY_NAME%.pem     - Private key file
echo   📦 %PFX_NAME%.pfx     - PKCS#12 certificate for .NET
echo.
echo Certificate details:
echo   🌐 Common Name: %COMMON_NAME%
echo   🏢 Organization: %ORGANIZATION%
echo   📅 Valid for: %DAYS_VALID% days
echo   🔒 Password: %CERT_PASSWORD%

echo.
echo Certificate Information:
!OPENSSL_PATH! x509 -in "%CERT_NAME%.pem" -text -noout | findstr /R "Issuer Subject Before After"

echo.
echo Note: This is a self-signed certificate for development use only.
echo Browsers will show security warnings. Click 'Advanced' → 'Proceed to localhost' to continue.

echo.
echo You can now run your application with:
echo   dotnet run --launch-profile https

cd ..

echo.
echo ✅ Certificate generation completed successfully!
pause