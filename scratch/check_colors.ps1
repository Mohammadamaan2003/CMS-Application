Add-Type -AssemblyName System.Drawing
$img1 = New-Object System.Drawing.Bitmap "C:\Users\moham\.gemini\antigravity\brain\a075f20c-50f9-4b7e-8b37-506fda0d222b\.user_uploaded\media_1794903584892_eb888060.png"

# Check pixels in the summary table: y around 260, x around 100-300
Write-Host "Summary table text pixels:"
for ($x = 90; $x -lt 250; $x += 10) {
    $p = $img1.GetPixel($x, 265)
    $hex = "#{0:X2}{1:X2}{2:X2}" -f $p.R, $p.G, $p.B
    Write-Host "Pixel ($x, 265): $hex"
}

# Check pixels in the preview table: y around 520, x around 400-600 (KNAPP UK, etc.)
Write-Host "Preview table text pixels:"
for ($x = 450; $x -lt 650; $x += 15) {
    $p = $img1.GetPixel($x, 520)
    $hex = "#{0:X2}{1:X2}{2:X2}" -f $p.R, $p.G, $p.B
    Write-Host "Pixel ($x, 520): $hex"
}

$img1.Dispose()
