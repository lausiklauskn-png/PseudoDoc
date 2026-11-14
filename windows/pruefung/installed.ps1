# Installiert den Prüfbau, startet ihn zweimal (erste, neustart) und entfernt ihn wieder. Nur auf dem GitHub-Windows-Rechner.
# Vorbild BookLedgerPro windows/pruefung/installed.ps1.
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true') { throw 'Diese Probe läuft nur auf dem abgeschotteten GitHub-Rechner.' }
$appDir = Join-Path $env:LOCALAPPDATA 'PseudoDoc Pro'
$exe = Join-Path $appDir 'pseudodoc-pro.exe'
$env:PD_WINDOWS_TEST_EXE = $exe
$env:PD_WINDOWS_TEST_FOLDER = Join-Path $env:RUNNER_TEMP 'PD Probe'
$env:PD_WINDOWS_TEST_SAVE_FOLDER = Join-Path $env:RUNNER_TEMP 'pd-speichern-probe'
New-Item -ItemType Directory -Force $env:PD_WINDOWS_TEST_FOLDER, (Join-Path $env:PD_WINDOWS_TEST_FOLDER 'Bank'), $env:PD_WINDOWS_TEST_SAVE_FOLDER, 'windows/pruef-out' | Out-Null
# Drei erfundene Dateien (keine echten Daten).
Set-Content -Encoding utf8 -Path (Join-Path $env:PD_WINDOWS_TEST_FOLDER 'Strom 2026.txt') -Value "Stadtwerke Musterstadt`nAbschlag Strom Januar 2026"
Set-Content -Encoding utf8 -Path (Join-Path $env:PD_WINDOWS_TEST_FOLDER 'Versicherung.txt') -Value "Muster Versicherung AG`nBeitragsrechnung 2026"
Set-Content -Encoding utf8 -Path (Join-Path $env:PD_WINDOWS_TEST_FOLDER 'Bank/Auszug 01.txt') -Value "Musterbank eG`nKontoauszug 1/2026"
$setup = (Get-ChildItem windows/src-tauri/target/release/bundle/nsis -Filter '*-setup.exe' | Select-Object -First 1).FullName
function Run-Setup($file) {
  $process = Start-Process -FilePath $file -ArgumentList '/S' -PassThru
  if (!$process.WaitForExit(180000)) { $process | Stop-Process -Force; throw 'Installer hängt.' }
  if ($process.ExitCode -ne 0) { throw "Installer fehlgeschlagen: $($process.ExitCode)" }
}
function Phase($name) {
  $app = Start-Process -FilePath $exe -PassThru
  node windows/pruefung/installed.mjs $name "windows/pruef-out/$name.json"
  $code = $LASTEXITCODE
  $java = @(Get-CimInstance Win32_Process -Filter "name='java.exe'" | Where-Object ParentProcessId -eq $app.Id | ForEach-Object ProcessId)
  $engineSeen = $java.Count -ge 1
  Get-Process pseudodoc-pro -ErrorAction SilentlyContinue | Stop-Process -Force
  Start-Sleep -Seconds 3
  if ($java.Count -and (Get-Process -Id $java -ErrorAction SilentlyContinue)) { throw 'Die Engine lief nach dem Schließen der App weiter.' }
  if ($code -ne 0) { throw "Abnahme fehlgeschlagen: $name" }
  if (!$engineSeen) { throw 'Die Java-Engine war nicht als Kindprozess der App zu sehen.' }
}
Run-Setup $setup
if (!(Test-Path $exe)) { throw "Programm nicht unter $exe installiert." }
if (!(Test-Path (Join-Path $appDir 'runtime/jre/bin/java.exe'))) { throw 'Die mitgelieferte Java-Laufzeit fehlt in der Installation.' }
$registration = Get-ItemProperty 'HKCU:\Software\Classes\Applications\pseudodoc-pro.exe\shell\open\command'
if (!$registration.'(default)'.Contains('pseudodoc-pro.exe')) { throw '„Öffnen mit“ ist nicht eingetragen.' }
Phase 'erste'
Phase 'neustart'
Run-Setup (Join-Path $appDir 'uninstall.exe')
# NSIS startet den Deinstaller als Kopie im Temp-Ordner: gewartet wird auf Programm UND Eintrag (Lehre aus BookLedgerPro).
$deadline = [DateTime]::UtcNow.AddSeconds(60)
while (((Test-Path $exe) -or (Test-Path 'HKCU:\Software\Classes\Applications\pseudodoc-pro.exe')) -and [DateTime]::UtcNow -lt $deadline) { Start-Sleep -Milliseconds 250 }
if (Test-Path $exe) { throw 'Die Deinstallation hat das Programm nicht entfernt.' }
if (Test-Path 'HKCU:\Software\Classes\Applications\pseudodoc-pro.exe') { throw '„Öffnen mit“ blieb nach der Deinstallation eingetragen.' }
if (!(Test-Path (Join-Path $env:PD_WINDOWS_TEST_FOLDER 'Strom 2026.txt'))) { throw 'Die Deinstallation hat den Ordner angefasst.' }
Write-Output 'PASS Installieren, zweimal starten, Auftrag gemerkt, Deinstallieren (Ordner und Originale bleiben)'
