import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it, expect, afterEach } from 'vitest';
import sharp from 'sharp';
import {
  runCutoutsStage,
  runCleanupStage,
  runRigStage,
  runAnimationStage,
  runExportsStage,
  runQaStage,
} from './run-stages.js';

describe('asset stages 02-07', () => {
  let workDir: string;

  afterEach(async () => {
    if (workDir) {
      for (let i = 0; i < 5; i++) {
        try {
          await rm(workDir, { recursive: true, force: true });
          break;
        } catch {
          await new Promise((r) => setTimeout(r, 50 * (i + 1)));
        }
      }
    }
  });

  it('enchaîne cutouts → cleanup → rig → animation → exports → qa', async () => {
    workDir = await mkdtemp(join(tmpdir(), 'ellipse-stages-'));
    const source = join(workDir, 'ref.png');
    await sharp({
      create: { width: 128, height: 192, channels: 4, background: { r: 80, g: 120, b: 200, alpha: 1 } },
    })
      .png()
      .toFile(source);

    const cutouts = await runCutoutsStage({ sourcePath: source, outputDir: join(workDir, '02_cutouts') });
    expect(cutouts.cutoutPath).toBeTruthy();

    const cleanup = await runCleanupStage({ cutoutsDir: join(workDir, '02_cutouts'), outputDir: join(workDir, '03_cleanup') });
    expect(cleanup.partCount).toBeGreaterThan(0);

    const rig = await runRigStage({ cleanupDir: join(workDir, '03_cleanup'), outputDir: join(workDir, '04_rig') });
    expect(rig.partCount).toBeGreaterThan(0);

    const anim = await runAnimationStage({ sourcePath: cleanup.silhouettePath, outputDir: join(workDir, '05_animation') });
    expect(anim.walkSheetPath).toBeTruthy();

    const exports = await runExportsStage({
      animationDir: join(workDir, '05_animation'),
      rigDir: join(workDir, '04_rig'),
      outputDir: join(workDir, '06_exports'),
    });
    expect(exports.atlasPath).toBeTruthy();

    const qa = await runQaStage({ exportsDir: join(workDir, '06_exports'), outputDir: join(workDir, '07_qa') });
    expect(qa.score).toBeGreaterThan(0);
  }, 20_000);
});
