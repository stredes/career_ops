$ErrorActionPreference = 'SilentlyContinue'

Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -eq 'node.exe' -and
    ($_.CommandLine -like '*dashboard-web/server.mjs*' -or
     $_.CommandLine -like '*dashboard-web\server.mjs*' -or
     $_.CommandLine -like '*dashboard-web/monitor-agent.mjs*' -or
     $_.CommandLine -like '*dashboard-web\monitor-agent.mjs*')
  } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

