param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectRoot,

    [Parameter(Mandatory = $true)]
    [string]$BlenderPath,

    [switch]$SkipRender
)

$ErrorActionPreference = "Stop"
$builder = Join-Path $ProjectRoot "tools\blender\build_orbes_guardians_v2.py"
$manifestPath = Join-Path $ProjectRoot "workspaces\orbes-d-astra\01_preproduction\manifests\characters-3d.json"
$catalogRoot = Join-Path $ProjectRoot "workspaces\orbes-d-astra\03_assets\3d\catalog_v2"
$logDir = Join-Path $catalogRoot "logs"
$statusPath = Join-Path $catalogRoot "guardians-v2-build.status.log"
$renderValue = if ($SkipRender) { "0" } else { "1" }

New-Item -ItemType Directory -Force -Path $logDir | Out-Null
Set-Content -LiteralPath $statusPath -Value "BUILD_STARTED $(Get-Date -Format o)"
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json

foreach ($guardian in $manifest.guardians) {
    $id = $guardian.id
    Add-Content -LiteralPath $statusPath -Value "CATALOG_START $id $(Get-Date -Format o)"
    $logPath = Join-Path $logDir "$id.log"
    & $BlenderPath --background --python-exit-code 1 --python $builder -- `
        --project-root $ProjectRoot `
        --guardian-id $id `
        --render $renderValue *> $logPath
    if ($LASTEXITCODE -ne 0) {
        Add-Content -LiteralPath $statusPath -Value "CATALOG_FAILED $id $LASTEXITCODE $(Get-Date -Format o)"
        exit $LASTEXITCODE
    }
    $glbPath = Join-Path $catalogRoot "guardians\$id\${id}_lod0.glb"
    $glb = Get-Item -LiteralPath $glbPath
    Add-Content -LiteralPath $statusPath -Value "CATALOG_DONE $id $($glb.Length) $(Get-Date -Format o)"
}

Add-Content -LiteralPath $statusPath -Value "BUILD_COMPLETE $(Get-Date -Format o)"
