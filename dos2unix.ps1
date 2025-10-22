<#
.SYNOPSIS
    Recursively converts Windows (CRLF) line endings to Unix (LF) line endings 
    for text files in a specified directory.

.PARAMETER TargetPath
    The root directory to start the recursive search from.
    Defaults to the directory the script is run from.

.PARAMETER FileFilter
    A filter pattern for files to process (e.g., "*.sh", "*.py", "*.txt").
    Defaults to all files ("*.*").
#>
param(
    [Parameter(Mandatory=$false)]
    [string]$TargetPath = (Get-Location).Path,

    [Parameter(Mandatory=$false)]
    [string]$FileFilter = "*.sh"
)

# Set the desired encoding to UTF8. Bash scripts are typically UTF-8.
# Using 'UTF8' (or 'UTF8NoBOM' in newer PS versions) prevents adding a Byte Order Mark.
$Encoding = 'UTF8' 

Write-Host "Starting EOL conversion..."
Write-Host "Target Path: $TargetPath"
Write-Host "File Filter: $FileFilter"
Write-Host "Output Encoding: $Encoding"
Write-Host "------------------------------------"

# 1. Use Get-ChildItem to find files recursively.
Get-ChildItem -Path $TargetPath -Filter $FileFilter -File -Recurse | ForEach-Object {
    
    $FilePath = $_.FullName

    try {
        # 2. Read the entire file content as a single string (-Raw).
        # This is essential for proper replacement of line endings.
        $Content = Get-Content -Path $FilePath -Raw -Encoding $Encoding

        # 3. Use the -replace operator to globally replace CRLF (`r`n) with LF (`n`).
        # `r is Carriage Return, `n is Line Feed.
        $ModifiedContent = $Content -replace "`r`n", "`n"

        # Check if any change was actually made
        if ($Content -ne $ModifiedContent) {
            # 4. Write the modified content back to the file.
            # -NoNewline is crucial to prevent PowerShell from adding an extra CRLF at the end.
            Set-Content -Path $FilePath -Value $ModifiedContent -Encoding $Encoding -NoNewline
            Write-Host "SUCCESS: Converted EOL for $($_.Name)" -ForegroundColor Green
        } else {
            Write-Host "SKIPPED: $($_.Name) - Already uses LF line endings." -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "ERROR: Failed to process $($_.Name). Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "------------------------------------"
Write-Host "Conversion complete."