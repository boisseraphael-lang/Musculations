[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$assetPath = "c:\Users\boiss\OneDrive\Documents\doissier Muscu\asset"
$outputPath = "c:\Users\boiss\OneDrive\Documents\doissier Muscu\version-clean\muscle-assets.js"

$output = "const MUSCLE_ASSETS = {`n"

$files = Get-ChildItem -Path $assetPath -Filter "*.png"
foreach ($file in $files) {
    $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
    $base64 = [Convert]::ToBase64String($bytes)
    
    # Convert filename to key - remove extension and normalize
    $key = $file.BaseName
    
    # Replace special French characters manually using char codes
    $key = $key.Replace([char]239, 'i')  # ï
    $key = $key.Replace([char]233, 'e')  # é
    $key = $key.Replace([char]232, 'e')  # è
    $key = $key.Replace([char]234, 'e')  # ê
    $key = $key.Replace([char]224, 'a')  # à
    $key = $key.Replace([char]226, 'a')  # â
    $key = $key.Replace([char]244, 'o')  # ô
    $key = $key.Replace([char]251, 'u')  # û
    $key = $key.Replace([char]231, 'c')  # ç
    $key = $key.Replace(' ', '_')
    $key = $key.Replace('(', '')
    $key = $key.Replace(')', '')
    while ($key.Contains('__')) {
        $key = $key.Replace('__', '_')
    }
    $key = $key.Trim('_')
    
    $output += "    `"$key`": `"data:image/png;base64,$base64`",`n"
}

$output = $output.TrimEnd(",`n") + "`n"
$output += "};"

Set-Content -Path $outputPath -Value $output -Encoding UTF8
Write-Host "Generated muscle-assets.js with $($files.Count) assets"
Write-Host "Keys generated:"
foreach ($file in $files) {
    $key = $file.BaseName
    $key = $key.Replace([char]239, 'i')
    $key = $key.Replace([char]233, 'e')
    $key = $key.Replace([char]232, 'e')
    $key = $key.Replace([char]234, 'e')
    $key = $key.Replace([char]224, 'a')
    $key = $key.Replace([char]226, 'a')
    $key = $key.Replace([char]244, 'o')
    $key = $key.Replace([char]251, 'u')
    $key = $key.Replace([char]231, 'c')
    $key = $key.Replace(' ', '_')
    $key = $key.Replace('(', '')
    $key = $key.Replace(')', '')
    while ($key.Contains('__')) {
        $key = $key.Replace('__', '_')
    }
    $key = $key.Trim('_')
    Write-Host "  - $key"
}
