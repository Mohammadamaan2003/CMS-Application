Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('C:\Users\moham\Downloads\CMS MCP\table_crop.png')
# let's see x=600 to 1024, y=200 to height
$rect = New-Object System.Drawing.Rectangle(600, 180, 424, $img.Height - 180)
$bmp = New-Object System.Drawing.Bitmap($rect.Width, $rect.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.DrawImage($img, 0, 0, $rect, [System.Drawing.GraphicsUnit]::Pixel)
$bmp.Save('C:\Users\moham\Downloads\CMS MCP\right_crop.png', [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
$img.Dispose()
Write-Host "right_crop.png saved"

