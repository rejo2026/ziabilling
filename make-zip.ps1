Add-Type -AssemblyName System.IO.Compression.FileSystem

$sourceDir = Join-Path $PSScriptRoot "dist-electron\win-unpacked"
$outputZip = Join-Path $PSScriptRoot "Zia-Billing-Package-Ready-To-Run.zip"

if (Test-Path $outputZip) { Remove-Item $outputZip -Force }

Write-Host "Creating deployment package zip from $sourceDir..."
[System.IO.Compression.ZipFile]::CreateFromDirectory($sourceDir, $outputZip)
Write-Host "Zip created successfully at: $outputZip"
