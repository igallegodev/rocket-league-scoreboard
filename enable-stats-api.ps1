# Enables the Rocket League Stats API so the scoreboard panel can connect.
# Finds the game (Steam or Epic), backs up the config file and only touches the
# [TAGame.MatchStatsExporter_TA] section, keeping everything else as it was.
# Usage: double-click enable-stats-api.bat, or
#   powershell -ExecutionPolicy Bypass -File enable-stats-api.ps1 [-GamePath <folder>] [-Undo] [-DryRun] [-Yes] [-NoPause]
param(
  [string]$GamePath, # game folder (the one that contains TAGame); found automatically if omitted
  [switch]$Undo,     # restore the latest backup made by this script
  [switch]$DryRun,   # show what would change without writing anything
  [switch]$Yes,      # don't ask for confirmation
  [switch]$NoPause   # don't wait for Enter before closing
)

$ErrorActionPreference = 'Stop'
$Section = 'TAGame.MatchStatsExporter_TA'
$es = (Get-UICulture).Name -like 'es*'

function T([string]$esText, [string]$enText) { if ($es) { $esText } else { $enText } }
function Say([string]$text, [string]$color = 'Gray') { Write-Host $text -ForegroundColor $color }
function Done([int]$code = 0) {
  if (-not $NoPause) { Read-Host (T 'Pulsa Enter para salir' 'Press Enter to exit') | Out-Null }
  exit $code
}
function Ask([string]$question, [bool]$default = $true) {
  if ($Yes) { return $true }
  $a = Read-Host "$question $(if ($default) { T '(S/n)' '(Y/n)' } else { T '(s/N)' '(y/N)' })"
  if ($a -eq '') { return $default }
  return $a -match '^[sSyY]'
}
function Test-Install([string]$path) { $path -and (Test-Path -LiteralPath (Join-Path $path 'TAGame\Config')) }

# Relaunches this script as administrator, for installs in folders that need it
function Invoke-Elevated {
  $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator)
  if ($isAdmin) { return }
  if (-not (Ask (T 'No tengo permiso para escribir ahí. ¿Lo intento como administrador?' "I can't write there. Try again as administrator?"))) { return }
  $argList = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$PSCommandPath`"", '-GamePath', "`"$GamePath`"", '-Yes')
  if ($Undo) { $argList += '-Undo' }
  Start-Process powershell -Verb RunAs -ArgumentList $argList
  exit 0
}

function Find-Installs {
  $found = @()
  # Steam: every library listed in libraryfolders.vdf (the game can be on another drive)
  $roots = @()
  foreach ($key in 'HKCU:\Software\Valve\Steam', 'HKLM:\SOFTWARE\WOW6432Node\Valve\Steam') {
    $p = Get-ItemProperty $key -ErrorAction SilentlyContinue
    if ($p.SteamPath) { $roots += $p.SteamPath }
    if ($p.InstallPath) { $roots += $p.InstallPath }
  }
  foreach ($root in $roots) {
    $libs = @($root)
    $vdf = Join-Path $root 'steamapps\libraryfolders.vdf'
    if (Test-Path -LiteralPath $vdf) {
      $libs += Select-String -LiteralPath $vdf -Pattern '"path"\s+"([^"]+)"' |
        ForEach-Object { $_.Matches[0].Groups[1].Value -replace '\\\\', '\' }
    }
    foreach ($lib in $libs) { $found += [pscustomobject]@{ Store = 'Steam'; Path = Join-Path $lib 'steamapps\common\rocketleague' } }
  }
  # Epic: launcher manifests (not tested with a real Epic install)
  $manifests = Join-Path $env:ProgramData 'Epic\EpicGamesLauncher\Data\Manifests'
  if (Test-Path -LiteralPath $manifests) {
    foreach ($item in Get-ChildItem -LiteralPath $manifests -Filter *.item) {
      try { $m = Get-Content -LiteralPath $item.FullName -Raw | ConvertFrom-Json } catch { continue }
      if ($m.DisplayName -like 'Rocket League*' -and $m.InstallLocation) {
        $found += [pscustomobject]@{ Store = 'Epic'; Path = $m.InstallLocation }
      }
    }
  }
  # Only real installs, once each (the same Steam folder can be listed twice)
  $seen = @{}
  foreach ($f in $found) {
    if (-not (Test-Install $f.Path)) { continue }
    $f.Path = (Resolve-Path -LiteralPath $f.Path).Path
    if (-not $seen.ContainsKey($f.Path.ToLower())) { $seen[$f.Path.ToLower()] = $true; $f }
  }
}

Say (T 'Activar la Stats API de Rocket League para el marcador' 'Enable the Rocket League Stats API for the scoreboard') Cyan
Say ''

# ---------- Find the game ----------
if ($GamePath) {
  if (-not (Test-Install $GamePath)) { Say (T "No encuentro TAGame\Config en $GamePath" "Can't find TAGame\Config in $GamePath") Red; Done 1 }
} else {
  $installs = @(Find-Installs)
  if ($installs.Count -eq 1) {
    $GamePath = $installs[0].Path
  } elseif ($installs.Count -gt 1) {
    if ($Yes) { Say (T 'Hay varias instalaciones: indica una con -GamePath.' 'Several installs found: pick one with -GamePath.') Red; Done 1 }
    Say (T 'He encontrado varias instalaciones:' 'Found several installs:')
    for ($i = 0; $i -lt $installs.Count; $i++) { Say "  $($i + 1). [$($installs[$i].Store)] $($installs[$i].Path)" White }
    $n = (Read-Host (T 'Elige un número' 'Pick a number')) -as [int]
    if ($n -ge 1 -and $n -le $installs.Count) { $GamePath = $installs[$n - 1].Path }
  }
  while (-not (Test-Install $GamePath)) {
    if ($Yes) { Say (T 'No encuentro Rocket League: indica la carpeta con -GamePath.' "Can't find Rocket League: pass its folder with -GamePath.") Red; Done 1 }
    Say (T 'No encuentro Rocket League.' "Can't find Rocket League.") Yellow
    $GamePath = (Read-Host (T 'Pega la carpeta del juego (la que contiene TAGame) o deja vacío para salir' 'Paste the game folder (the one with TAGame) or leave empty to exit')).Trim(' "')
    if (-not $GamePath) { Done 1 }
  }
}
$cfg = Join-Path $GamePath 'TAGame\Config'
Say "$(T 'Juego' 'Game'): $GamePath"

# The game only reads the file on startup
while (Get-Process RocketLeague -ErrorAction SilentlyContinue) {
  Say (T 'Rocket League está abierto. Ciérralo: el juego solo lee la configuración al arrancar.' 'Rocket League is running. Close it: the game only reads the config on startup.') Yellow
  if ($DryRun) { break }
  if ($Yes) { Done 1 }
  Read-Host (T 'Pulsa Enter cuando lo hayas cerrado' 'Press Enter once it is closed') | Out-Null
}

# TAStatsAPI.ini takes priority when it exists; otherwise the game uses DefaultStatsAPI.ini
$file = Join-Path $cfg 'TAStatsAPI.ini'
if (-not (Test-Path -LiteralPath $file)) { $file = Join-Path $cfg 'DefaultStatsAPI.ini' }
$name = Split-Path $file -Leaf
Say "$(T 'Fichero' 'File'): $file"
Say ''
$backups = @(Get-ChildItem -LiteralPath $cfg -Filter "$name.bak-*" | Sort-Object Name -Descending)

# ---------- Undo ----------
if ($Undo) {
  if (-not $backups.Count) { Say (T 'No hay ninguna copia de este script que restaurar.' 'There is no backup from this script to restore.') Yellow; Done 1 }
  if ($DryRun) { Say (T "Se restauraría $($backups[0].Name)." "Would restore $($backups[0].Name).") ; Done 0 }
  try { Copy-Item -LiteralPath $backups[0].FullName $file -Force }
  catch { Invoke-Elevated; Say "$(T 'Error' 'Error'): $($_.Exception.Message)" Red; Done 1 }
  Say (T "Restaurada la copia $($backups[0].Name)." "Restored backup $($backups[0].Name).") Green
  Done 0
}

# ---------- Read the current values ----------
$lines = @(if (Test-Path -LiteralPath $file) { Get-Content -LiteralPath $file })
$start = -1; $end = $lines.Count
for ($i = 0; $i -lt $lines.Count; $i++) {
  $l = $lines[$i].Trim()
  if ($start -lt 0) { if ($l -ieq "[$Section]") { $start = $i } }
  elseif ($l.StartsWith('[')) { $end = $i; break }
}
function Get-Value([string]$key) {
  if ($start -lt 0) { return $null }
  for ($i = $start + 1; $i -lt $end; $i++) { if ($lines[$i] -match "^\s*$key\s*=\s*(.*?)\s*$") { return $Matches[1] } }
  return $null
}
$rate = Get-Value 'PacketSendRate'; $web = Get-Value 'WebPort'; $tcp = Get-Value 'Port'

# Only what's needed: if the API was already on, another tool may be using it, so its ports stay as they are
$apiOff = -not ($rate -as [int])
$changes = [ordered]@{}
if ($apiOff) { $changes['PacketSendRate'] = '30' }
if (-not ($web -as [int])) { $changes['WebPort'] = '49124' }
if ($apiOff -and $tcp -ne '0') { $changes['Port'] = '0' } # closes the TCP socket (49123), which the panel doesn't use

if (-not $changes.Count) {
  Say (T 'La Stats API ya está activada.' 'The Stats API is already enabled.') Green
  Say "  PacketSendRate=$rate, WebPort=$web"
  if ($web -ne '49124') { Say (T "  El panel usa el puerto 49124: ábrelo con ?port=$web" "  The panel uses port 49124: open it with ?port=$web") Yellow }
  if ($backups.Count -and -not $DryRun -and -not $Yes) {
    Say ''
    if (Ask (T "¿Quieres deshacerlo y restaurar la copia $($backups[0].Name)?" "Undo it and restore backup $($backups[0].Name)?") $false) {
      try { Copy-Item -LiteralPath $backups[0].FullName $file -Force }
      catch { $Undo = $true; Invoke-Elevated; Say "$(T 'Error' 'Error'): $($_.Exception.Message)" Red; Done 1 }
      Say (T 'Copia restaurada.' 'Backup restored.') Green
    }
  }
  Done 0
}

Say (T 'Cambios:' 'Changes:')
foreach ($k in $changes.Keys) {
  $old = Get-Value $k
  if ($null -eq $old) { $old = T '(no está)' '(missing)' }
  Say "  ${k}: $old -> $($changes[$k])" White
}
Say ''

# ---------- Build the new file ----------
$new = New-Object System.Collections.Generic.List[string]
if ($start -lt 0) {
  foreach ($l in $lines) { $new.Add($l) }
  if ($new.Count -and $new[$new.Count - 1].Trim()) { $new.Add('') }
  $new.Add("[$Section]")
  foreach ($k in $changes.Keys) { $new.Add("$k=$($changes[$k])") }
} else {
  # Keys go where they already are; missing ones after the section's last line
  $last = $start
  for ($i = $start + 1; $i -lt $end; $i++) { if ($lines[$i].Trim()) { $last = $i } }
  $set = @{}
  for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    if ($i -gt $start -and $i -lt $end) {
      foreach ($k in $changes.Keys) { if ($line -match "^\s*$k\s*=") { $line = "$k=$($changes[$k])"; $set[$k] = $true } }
    }
    $new.Add($line)
    if ($i -eq $last) { foreach ($k in $changes.Keys) { if (-not $set[$k]) { $new.Add("$k=$($changes[$k])") } } }
  }
}

if ($DryRun) { Say (T 'Prueba: no se ha cambiado nada.' 'Dry run: nothing was changed.') Yellow; Done 0 }
if (-not (Ask (T '¿Aplicar los cambios?' 'Apply the changes?'))) { Done 0 }

try {
  $backup = $null
  if (Test-Path -LiteralPath $file) {
    $backup = "$file.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item -LiteralPath $file $backup
  }
  [IO.File]::WriteAllLines($file, $new)
} catch {
  Invoke-Elevated
  Say "$(T 'Error' 'Error'): $($_.Exception.Message)" Red
  Done 1
}

Say (T 'Listo. Abre el juego y luego el marcador.' 'Done. Start the game, then open the scoreboard.') Green
if ($changes.Contains('Port')) {
  Say (T 'Port=0 cierra el socket TCP 49123, que el panel no usa. Si otra herramienta lo necesita, vuelve a poner Port=49123.' 'Port=0 closes the TCP socket 49123, which the panel does not use. If another tool needs it, set Port=49123 again.')
}
if ($backup) {
  Say "$(T 'Copia del fichero anterior' 'Backup of the previous file'): $(Split-Path $backup -Leaf)"
  Say (T 'Para deshacerlo, vuelve a ejecutar este script.' 'To undo it, run this script again.')
}
Done 0
