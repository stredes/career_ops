$ErrorActionPreference = 'SilentlyContinue'

$Root = Resolve-Path (Join-Path $PSScriptRoot '..')
$MonitorProfile = Join-Path $Root '.monitor-browser-profile'
$MonitorPort = '9223'

Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -eq 'node.exe' -and
    ($_.CommandLine -like '*dashboard-web/server.mjs*' -or
     $_.CommandLine -like '*dashboard-web\server.mjs*' -or
     $_.CommandLine -like '*dashboard-web/monitor-agent.mjs*' -or
     $_.CommandLine -like '*dashboard-web\monitor-agent.mjs*')
  } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -eq 'chrome.exe' -and
    ($_.CommandLine -like "*--remote-debugging-port=$MonitorPort*" -or
     $_.CommandLine -like "*$MonitorProfile*")
  } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
