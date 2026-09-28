param()
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$compiler = Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
$buildRoot = Join-Path $projectRoot 'generated/ellipse-launcher'
$iconPath = Join-Path $projectRoot 'apps/ellipse-desktop/assets/ellipse-app.ico'
$sourcePath = Join-Path $PSScriptRoot 'windows/EllipseLauncher.cs'
$newExe = Join-Path $buildRoot 'Ellipse.exe'
$targetExe = Join-Path $projectRoot 'Ellipse.exe'
New-Item -ItemType Directory -Path $buildRoot -Force | Out-Null
& node (Join-Path $PSScriptRoot 'build-ellipse-icon.mjs')
if ($LASTEXITCODE -ne 0) { throw 'La génération de l’icône a échoué.' }
& $compiler /nologo /target:winexe /platform:anycpu /optimize+ /reference:System.Windows.Forms.dll /reference:System.Drawing.dll "/win32icon:$iconPath" "/out:$newExe" $sourcePath
if ($LASTEXITCODE -ne 0) { throw 'La compilation du lanceur a échoué.' }
if (Test-Path -LiteralPath $targetExe) {
    $backupPath = Join-Path $buildRoot ('Ellipse-backup-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.exe')
    Copy-Item -LiteralPath $targetExe -Destination $backupPath
    Write-Output "Ancien lanceur sauvegardé : $backupPath"
}
Copy-Item -LiteralPath $newExe -Destination $targetExe -Force
Write-Output "Lanceur reconstruit : $targetExe"
