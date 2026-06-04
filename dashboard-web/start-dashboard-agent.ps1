$ErrorActionPreference = 'Stop'

$Root = Resolve-Path (Join-Path $PSScriptRoot '..')
$Node = (Get-Command node).Source

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

Stop-ExistingCareerOpsNode

Start-Process -FilePath $Node -ArgumentList @('dashboard-web/server.mjs') -WorkingDirectory $Root -WindowStyle Hidden
Start-Process -FilePath $Node -ArgumentList @('dashboard-web/monitor-agent.mjs') -WorkingDirectory $Root -WindowStyle Hidden

