# Fix Shell Script Encoding and Line Endings
# This script removes BOM and converts CRLF to LF for shell scripts

param(
    [Parameter(Mandatory=$true)]
    [string]$FilePath
)

Write-Host "Fixing encoding and line endings for: $FilePath" -ForegroundColor Cyan

# Check if file exists
if (-not (Test-Path $FilePath)) {
    Write-Host "Error: File not found: $FilePath" -ForegroundColor Red
    exit 1
}

try {
    # Read file content
    $content = Get-Content -Path $FilePath -Raw
    
    # Convert CRLF to LF
    $content = $content -replace "`r`n", "`n"
    
    # Write file without BOM and with LF line endings
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($FilePath, $content, $utf8NoBom)
    
    Write-Host "✓ Successfully fixed encoding and line endings" -ForegroundColor Green
    Write-Host "  - Removed BOM (Byte Order Mark)" -ForegroundColor Gray
    Write-Host "  - Converted line endings to LF (Unix format)" -ForegroundColor Gray
}
catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}
