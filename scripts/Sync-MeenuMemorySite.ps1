$ErrorActionPreference = 'Stop'
$sourceRoot = Split-Path -Parent $PSScriptRoot
$targetRoot = 'I:\Others\birthday-event-planner-backup-latest\birthday-event-planner-Meenu'
if ((Resolve-Path -LiteralPath $targetRoot).Path.TrimEnd('\') -ne $targetRoot) {
  throw 'The destination must be the explicitly requested Meenu project.'
}
$configPath = Join-Path $targetRoot 'frontend/src/config/eventConfig.js'
$existingConfig = [System.IO.File]::ReadAllText($configPath)
$contactMatch = [regex]::Match($existingConfig, 'contactNumbers:\s*\[[^\]]+\]')
if (!$contactMatch.Success) { throw 'Unable to preserve the Meenu contact numbers.' }
$backupRoot = Join-Path $env:TEMP ('devansh-meenu-before-memories-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
$files = @(
  'frontend/src/App.jsx',
  'frontend/src/GalleryPage.jsx',
  'frontend/src/gallery.jsx',
  'frontend/src/main.jsx',
  'frontend/src/memory-pages.css',
  'frontend/src/components/MediaGallery.jsx',
  'frontend/src/components/MediaGallery.css',
  'frontend/src/components/GalleryPreview.jsx',
  'frontend/src/components/MemoryNavigation.jsx',
  'frontend/src/config/devanshBirthdayGallery.json',
  'frontend/index.html',
  'frontend/gallery.html',
  'frontend/vite.config.js',
  'scripts/Import-BirthdayGallery.ps1',
  'scripts/check-memory-pages.mjs',
  'README.md'
)
foreach ($relativePath in ($files + 'frontend/src/config/eventConfig.js')) {
  $destination = Join-Path $targetRoot $relativePath
  if (Test-Path -LiteralPath $destination) {
    $backup = Join-Path $backupRoot $relativePath
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $backup) | Out-Null
    Copy-Item -LiteralPath $destination -Destination $backup
  }
}
foreach ($relativePath in $files) {
  $destination = Join-Path $targetRoot $relativePath
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
  Copy-Item -LiteralPath (Join-Path $sourceRoot $relativePath) -Destination $destination -Force
}
$newConfig = [System.IO.File]::ReadAllText((Join-Path $sourceRoot 'frontend/src/config/eventConfig.js'))
$newConfig = [regex]::Replace($newConfig, 'contactNumbers:\s*\[[^\]]+\]', $contactMatch.Value)
[System.IO.File]::WriteAllText($configPath, $newConfig, (New-Object System.Text.UTF8Encoding($false)))

$mediaSource = Join-Path $sourceRoot 'frontend/public/images/devansh-birthday'
$mediaTarget = Join-Path $targetRoot 'frontend/public/images/devansh-birthday'
foreach ($variant in @('thumbnails', 'previews', 'originals')) {
  $destination = Join-Path $mediaTarget $variant
  New-Item -ItemType Directory -Force -Path $destination | Out-Null
  foreach ($file in (Get-ChildItem -LiteralPath (Join-Path $mediaSource $variant) -File)) {
    Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $destination $file.Name) -Force
  }
}
Write-Output 'Meenu site updated with the memories pages and all 200 birthday photos; its contact numbers were preserved.'
Write-Output "Previous source files were backed up to $backupRoot"
