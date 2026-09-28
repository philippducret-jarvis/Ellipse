param(
    [double]$MinimumSimilarity = 0.985
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies 'System.Drawing' -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class OrbesImageComparison
{
    public static double[] Compare(string referencePath, string capturePath)
    {
        using (var reference = new Bitmap(referencePath))
        using (var capture = new Bitmap(capturePath))
        using (var resized = new Bitmap(capture.Width, capture.Height, PixelFormat.Format24bppRgb))
        {
            using (var graphics = Graphics.FromImage(resized))
            {
                graphics.CompositingMode = CompositingMode.SourceCopy;
                graphics.CompositingQuality = CompositingQuality.HighQuality;
                graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
                graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
                graphics.SmoothingMode = SmoothingMode.HighQuality;
                graphics.DrawImage(reference, new Rectangle(0, 0, capture.Width, capture.Height));
            }

            var rect = new Rectangle(0, 0, capture.Width, capture.Height);
            var leftData = resized.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format24bppRgb);
            var rightData = capture.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format24bppRgb);
            try
            {
                var left = new byte[Math.Abs(leftData.Stride) * leftData.Height];
                var right = new byte[Math.Abs(rightData.Stride) * rightData.Height];
                Marshal.Copy(leftData.Scan0, left, 0, left.Length);
                Marshal.Copy(rightData.Scan0, right, 0, right.Length);

                double absolute = 0.0;
                double squared = 0.0;
                long samples = (long)capture.Width * capture.Height * 3;
                for (int y = 0; y < capture.Height; y++)
                {
                    int leftRow = y * Math.Abs(leftData.Stride);
                    int rightRow = y * Math.Abs(rightData.Stride);
                    for (int x = 0; x < capture.Width * 3; x++)
                    {
                        double delta = left[leftRow + x] - right[rightRow + x];
                        absolute += Math.Abs(delta);
                        squared += delta * delta;
                    }
                }

                double mae = absolute / samples;
                double rmse = Math.Sqrt(squared / samples);
                double similarity = Math.Max(0.0, 1.0 - (mae / 255.0));
                return new[] { mae, rmse, similarity };
            }
            finally
            {
                resized.UnlockBits(leftData);
                capture.UnlockBits(rightData);
            }
        }
    }
}
'@

$pairs = @(
    @{
        screen = 'hub'
        reference = 'workspaces/orbes-d-astra/01_preproduction/mockups/01_hub_pc_direction.png'
        capture = 'workspaces/orbes-d-astra/04_runtime/godot/qa/runtime-hub.png'
    },
    @{
        screen = 'combat_pc'
        reference = 'workspaces/orbes-d-astra/01_preproduction/mockups/02_combat_pc_direction.png'
        capture = 'workspaces/orbes-d-astra/04_runtime/godot/qa/runtime-combat.png'
    },
    @{
        screen = 'combat_mobile'
        reference = 'workspaces/orbes-d-astra/01_preproduction/mockups/03_combat_mobile_direction.png'
        capture = 'workspaces/orbes-d-astra/04_runtime/godot/qa/runtime-combat-mobile.png'
    },
    @{
        screen = 'roster_gacha'
        reference = 'workspaces/orbes-d-astra/01_preproduction/mockups/04_roster_gacha_direction.png'
        capture = 'workspaces/orbes-d-astra/04_runtime/godot/qa/runtime-gacha.png'
    },
    @{
        screen = 'side_games'
        reference = 'workspaces/orbes-d-astra/01_preproduction/mockups/05_side_games_direction.png'
        capture = 'workspaces/orbes-d-astra/04_runtime/godot/qa/runtime-side-games.png'
    }
)

$checks = foreach ($pair in $pairs) {
    $reference = Join-Path $root $pair.reference
    $capture = Join-Path $root $pair.capture
    if (-not (Test-Path -LiteralPath $reference)) { throw "Référence absente : $reference" }
    if (-not (Test-Path -LiteralPath $capture)) { throw "Capture absente : $capture" }
    $metrics = [OrbesImageComparison]::Compare($reference, $capture)
    [pscustomobject]@{
        screen = $pair.screen
        reference = $pair.reference
        capture = $pair.capture
        meanAbsoluteError = [math]::Round($metrics[0], 4)
        rootMeanSquareError = [math]::Round($metrics[1], 4)
        similarity = [math]::Round($metrics[2], 6)
        passed = $metrics[2] -ge $MinimumSimilarity
    }
}

$failed = @($checks | Where-Object { -not $_.passed })
$report = [pscustomobject]@{
    schemaVersion = 1
    generatedAt = [DateTime]::UtcNow.ToString('o')
    minimumSimilarity = $MinimumSimilarity
    status = if ($failed.Count -eq 0) { 'mockup_fidelity_passed' } else { 'failed' }
    passed = @($checks | Where-Object passed).Count
    failed = $failed.Count
    checks = $checks
}

$reportPath = Join-Path $root 'workspaces/orbes-d-astra/04_runtime/godot/qa/visual-fidelity-report.json'
$report | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $reportPath -Encoding utf8
$report | ConvertTo-Json -Depth 6
if ($failed.Count -gt 0) { exit 1 }
