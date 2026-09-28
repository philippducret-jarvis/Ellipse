param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectRoot,

    [Parameter(Mandatory = $true)]
    [string]$BlenderPath
)

$ErrorActionPreference = "Stop"
$builder = Join-Path $ProjectRoot "tools\blender\extract_orbes_loadouts_v2.py"
$manifestPath = Join-Path $ProjectRoot "workspaces\orbes-d-astra\01_preproduction\manifests\characters-3d.json"
$catalogRoot = Join-Path $ProjectRoot "workspaces\orbes-d-astra\03_assets\3d\catalog_v2"
$logDir = Join-Path $catalogRoot "loadout-logs"
$statusPath = Join-Path $catalogRoot "loadouts-v2-build.status.log"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null
Set-Content -LiteralPath $statusPath -Value "BUILD_STARTED $(Get-Date -Format o)"
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json

foreach ($guardian in $manifest.guardians) {
    $id = $guardian.id
    Add-Content -LiteralPath $statusPath -Value "LOADOUT_START $id $(Get-Date -Format o)"
    $logPath = Join-Path $logDir "$id.log"
    & $BlenderPath --background --python-exit-code 1 --python $builder -- `
        --project-root $ProjectRoot `
        --guardian-id $id *> $logPath
    if ($LASTEXITCODE -ne 0) {
        Add-Content -LiteralPath $statusPath -Value "LOADOUT_FAILED $id $LASTEXITCODE $(Get-Date -Format o)"
        exit $LASTEXITCODE
    }
    Add-Content -LiteralPath $statusPath -Value "LOADOUT_DONE $id $(Get-Date -Format o)"
}

Add-Content -LiteralPath $statusPath -Value "BUILD_COMPLETE $(Get-Date -Format o)"
