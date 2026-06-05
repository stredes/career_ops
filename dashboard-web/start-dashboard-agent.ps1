$ErrorActionPreference = 'Stop'

$Root = Resolve-Path (Join-Path $PSScriptRoot '..')
$Node = (Get-Command node).Source
$MonitorProfile = Join-Path $Root '.monitor-browser-profile'
$MonitorPort = '9223'

function Stop-ExistingCareerOpsNode {
  Get-CimInstance Win32_Process |
    Where-Object {
      $_.Name -eq 'node.exe' -and
      ($_.CommandLine -like '*dashboard-web/server.mjs*' -or
       $_.CommandLine -like '*dashboard-web\server.mjs*' -or
       $_.CommandLine -like '*dashboard-web/monitor-agent.mjs*' -or
       $_.CommandLine -like '*dashboard-web\monitor-agent.mjs*')
    } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}

function Stop-ExistingMonitorChrome {
  Get-CimInstance Win32_Process |
    Where-Object {
      $_.Name -eq 'chrome.exe' -and
      ($_.CommandLine -like "*--remote-debugging-port=$MonitorPort*" -or
       $_.CommandLine -like "*$MonitorProfile*")
    } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}

Stop-ExistingCareerOpsNode
Stop-ExistingMonitorChrome

Start-Process -FilePath $Node -ArgumentList @('dashboard-web/logins.js') -WorkingDirectory $Root -WindowStyle Hidden

Start-Process -FilePath $Node -ArgumentList @('dashboard-web/server.mjs') -WorkingDirectory $Root -WindowStyle Hidden
$env:CDP_URL = "http://127.0.0.1:$MonitorPort"
Start-Process -FilePath $Node -ArgumentList @('dashboard-web/monitor-agent.mjs') -WorkingDirectory $Root -WindowStyle Hidden
