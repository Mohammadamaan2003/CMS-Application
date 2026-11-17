Add-Type -AssemblyName System.Drawing
$img2 = New-Object System.Drawing.Bitmap "C:\Users\moham\.gemini\antigravity\brain\a075f20c-50f9-4b7e-8b37-506fda0d222b\.user_uploaded\media_1794903594840_aa8008fd.png"

Write-Host "Image 2 loaded: $($img2.Width) x $($img2.Height)"

# In Image 2, find pixels that are text in the first row:
# y between 50 and 80, x between 160 and 300
for ($y = 55; $y -le 65; $y += 2) {
    for ($x = 160; $x -le 220; $x += 4) {
        $p = $img2.GetPixel($x, $y)
        if ($p.R -gt 60 -or $p.G -gt 60 -or $p.B -gt 60) {
            $hex = "#{0:X2}{1:X2}{2:X2}" -f $p.R, $p.G, $p.B
            Write-Host "Pixel ($x, $y): $hex (R=$($p.R), G=$($p.G), B=$($p.B))"
        }
    }
}
$img2.Dispose()
