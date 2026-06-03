$chrome = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chrome)) {
  $chrome = "$env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe"
}
if (-not (Test-Path $chrome)) {
  throw "Chrome executable not found."
}

$root = "C:\Users\bodega 1\Desktop\workspace\career-ops"
$profile = Join-Path $root ".real-chrome-apply-profile"
New-Item -ItemType Directory -Force -Path $profile | Out-Null

$args = @(
  "--remote-debugging-port=9222",
  "--user-data-dir=`"$profile`"",
  "--no-first-run",
  "--no-default-browser-check",
  "--new-window",
  "https://www.getonbrd.com"
) -join " "

Start-Process -FilePath $chrome -ArgumentList $args

Write-Host "Chrome real iniciado con DevTools en http://127.0.0.1:9222"
Write-Host "Inicia sesion en Get on Board en esa ventana. Luego ejecuta el agente con CONNECT_CDP=1."
