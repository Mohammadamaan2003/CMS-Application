Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('C:\Users\moham\.gemini\antigravity\brain\9f636858-97bf-4599-b9bc-b8e50501dd29\.user_uploaded\media_1794417043838_87171226.png')
Write-Host "Image size: $($img.Width) x $($img.Height)"
$y = [int]($img.Height * 0.40)
$h = $img.Height - $y
$rect = New-Object System.Drawing.Rectangle(0, $y, $img.Width, $h)
$bmp = New-Object System.Drawing.Bitmap($rect.Width, $rect.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.DrawImage($img, 0, 0, $rect, [System.Drawing.GraphicsUnit]::Pixel)
$bmp.Save('C:\Users\moham\Downloads\CMS MCP\table_crop.png', [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
$img.Dispose()
Write-Host "Saved table_crop.png successfully"

