param(
  [Parameter(Mandatory = $true)]
  [string]$SourcePath
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$projectRoot = Split-Path -Parent $PSScriptRoot
$galleryRoot = Join-Path $projectRoot 'frontend/public/images/devansh-birthday'
$manifestPath = Join-Path $projectRoot 'frontend/src/config/devanshBirthdayGallery.json'
$extensions = @('.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tif', '.tiff')
$photos = @(Get-ChildItem -LiteralPath $SourcePath -File | Where-Object { $extensions -contains $_.Extension.ToLowerInvariant() } | Sort-Object Name)
if ($photos.Count -eq 0) { throw "No photos found in $SourcePath" }
foreach ($directory in @('originals', 'thumbnails', 'previews')) {
  New-Item -ItemType Directory -Force -Path (Join-Path $galleryRoot $directory) | Out-Null
}
$jpegEncoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }

function Save-ResizedPhoto($Image, [string]$Path, [int]$MaxEdge, [long]$Quality) {
  $scale = [Math]::Min([double]1, $MaxEdge / [double][Math]::Max($Image.Width, $Image.Height))
  $width = [Math]::Max(1, [int][Math]::Round($Image.Width * $scale))
  $height = [Math]::Max(1, [int][Math]::Round($Image.Height * $scale))
  $bitmap = New-Object System.Drawing.Bitmap($width, $height)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $encoderParameters = New-Object System.Drawing.Imaging.EncoderParameters(1)
  try {
    $graphics.Clear([System.Drawing.Color]::White)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.DrawImage($Image, 0, 0, $width, $height)
    $encoderParameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, $Quality)
    $bitmap.Save($Path, $jpegEncoder, $encoderParameters)
  } finally {
    $encoderParameters.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

$entries = @()
foreach ($photo in $photos) {
  $originalPath = Join-Path $galleryRoot ('originals/' + $photo.Name)
  Copy-Item -LiteralPath $photo.FullName -Destination $originalPath -Force
  $image = [System.Drawing.Image]::FromFile($photo.FullName)
  try {
    if ($image.PropertyIdList -contains 274) {
      $orientation = [BitConverter]::ToUInt16($image.GetPropertyItem(274).Value, 0)
      $rotations = @{
        2 = [System.Drawing.RotateFlipType]::RotateNoneFlipX
        3 = [System.Drawing.RotateFlipType]::Rotate180FlipNone
        4 = [System.Drawing.RotateFlipType]::Rotate180FlipX
        5 = [System.Drawing.RotateFlipType]::Rotate90FlipX
        6 = [System.Drawing.RotateFlipType]::Rotate90FlipNone
        7 = [System.Drawing.RotateFlipType]::Rotate270FlipX
        8 = [System.Drawing.RotateFlipType]::Rotate270FlipNone
      }
      if ($rotations.ContainsKey([int]$orientation)) { $image.RotateFlip($rotations[[int]$orientation]) }
    }
    $derivativeName = $photo.BaseName + '.jpg'
    Save-ResizedPhoto $image (Join-Path $galleryRoot ('thumbnails/' + $derivativeName)) 240 78
    Save-ResizedPhoto $image (Join-Path $galleryRoot ('previews/' + $derivativeName)) 1920 88
    $baseUrl = '/images/devansh-birthday'
    $entries += [ordered]@{
      title = $photo.BaseName
      alt = "Devansh Birthday celebration photo $($entries.Count + 1), $($photo.BaseName)"
      filename = $photo.Name
      thumbnailUrl = "$baseUrl/thumbnails/$derivativeName"
      url = "$baseUrl/previews/$derivativeName"
      originalUrl = "$baseUrl/originals/$($photo.Name)"
      width = $image.Width
      height = $image.Height
      bytes = $photo.Length
      sha256 = (Get-FileHash -LiteralPath $photo.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    }
  } finally { $image.Dispose() }
  if ($entries.Count % 20 -eq 0) { Write-Output "Imported $($entries.Count) / $($photos.Count) photos" }
}
$json = ConvertTo-Json -InputObject @($entries) -Depth 4
[System.IO.File]::WriteAllText($manifestPath, $json, (New-Object System.Text.UTF8Encoding($false)))
Write-Output "Imported all $($entries.Count) photos. Originals are preserved; thumbnails and previews are separate files."
