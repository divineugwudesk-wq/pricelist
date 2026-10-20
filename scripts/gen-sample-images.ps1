$d = 'C:\Users\ronaldo\Downloads'
$dir = (Get-ChildItem $d -Filter 'web images' -Directory).FullName
$files = Get-ChildItem $dir | Sort-Object Name

# Explicit filename -> desired camelCase export name
$map = @{}
$map['images.jpg'] = 'imagesJpg'
$map['shopping (1).webp'] = 'shopping1Webp'
$map['shopping (2).webp'] = 'shopping2Webp'
$map['shopping.webp'] = 'shoppingWebp'

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine('// Generated sample product images (base64 data URLs).')
[void]$sb.AppendLine('')
foreach ($f in $files) {
    $b = [Convert]::ToBase64String([IO.File]::ReadAllBytes($f.FullName))
    $mime = if ($f.Extension -eq '.jpg') { 'image/jpeg' } elseif ($f.Extension -eq '.webp') { 'image/webp' } else { 'image/jpeg' }
    $dataUrl = 'data:' + $mime + ';base64,' + $b
    $var = $map[$f.Name]
    $line = 'export const ' + $var + ' = `' + $dataUrl + '`;'
    [void]$sb.AppendLine($line)
}
[void]$sb.AppendLine('')
$out = 'C:\Users\ronaldo\Documents\PRICELIST\lib\sample-images.ts'
Set-Content -Path $out -Value $sb.ToString() -Encoding UTF8
Write-Host "Wrote $out with $($files.Count) images"
foreach ($f in $files) { Write-Host ($f.Name + ' -> ' + $map[$f.Name]) }