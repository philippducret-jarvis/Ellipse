import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { verifyVeloriaHd } from './verify-veloria-hd.mjs';

const SLUG = 'veloria-veille-des-lames';
const SCRIPT_PATH = fileURLToPath(new URL('./verify-veloria-hd.mjs', import.meta.url));
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function pngHeader(width, height) {
  const data = Buffer.alloc(24);
  PNG_SIGNATURE.copy(data, 0);
  data.writeUInt32BE(13, 8);
  data.write('IHDR', 12, 4, 'ascii');
  data.writeUInt32BE(width, 16);
  data.writeUInt32BE(height, 20);
  return data;
}

async function write(path, content) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}

async function writeJson(path, value) {
  await write(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), 'ellipse-veloria-verify-'));
  const workspaceDir = join(root, 'workspaces', SLUG);
  const webDir = join(workspaceDir, '07_exports', 'web');
  const gdlPath = join(workspaceDir, '05_runtime', 'gdl', 'veloria.preview.gdl.json');
  const reportPath = join(workspaceDir, '08_ops', 'manifests', 'priority-hd-verification.json');
  const url = (relativePath) => `/workspaces/${SLUG}/${relativePath.replaceAll('\\', '/')}`;

  const atlas = {
    aureline: url('03_assets/characters/heroines/aureline.png'),
    fallen_knight: url('03_assets/characters/enemies/fallen_knight.png'),
    bourreau: url('03_assets/characters/bosses/bourreau.png'),
  };
  const waves = Array.from({ length: 12 }, (_, index) => (
    index === 11
      ? { wave: 12, boss: { type: 'bourreau', spawn_lane: 'lane_center' } }
      : { wave: index + 1, enemies: [{ type: 'fallen_knight', lane: 'lane_center', count: 1 }] }
  ));
  const scenes = Array.from({ length: 6 }, (_, index) => ({
    id: `level_${String(index + 1).padStart(2, '0')}`,
    background: { image: url(`03_assets/environments/arena-${index + 1}.png`) },
    layout: {
      width: 720,
      height: 1280,
      lane_meta: {
        count: 3,
        lanes: [
          { id: 'lane_left', center_x: 180 },
          { id: 'lane_center', center_x: 360 },
          { id: 'lane_right', center_x: 540 },
        ],
      },
    },
    veloria: {
      encounters: {
        heroine_default: 'aureline',
        total_waves: 12,
        waves,
      },
    },
  }));
  const workspace = {
    slug: SLUG,
    title: 'Veloria — Veille des Lames',
    preview_url: url('07_exports/web/preview.html'),
  };
  const gdl = {
    meta: { title: 'Veloria — Veille des Lames', dimension: '2.5d', resolution: [720, 1280], asset_atlas: atlas },
    entities: [{ id: 'player', assets: { sprite: atlas.aureline } }],
    scenes,
  };

  await writeJson(join(workspaceDir, 'workspace.json'), workspace);
  await write(join(webDir, 'preview.html'), '<canvas id="preview"></canvas><script type="module" src="./preview.js"></script>\n');
  await write(join(webDir, 'preview.js'), "import './engine/ellipse-engine.js';\nconsole.log('Veloria flagship HD');\n");
  await write(join(webDir, 'engine', 'ellipse-engine.js'), 'export const engine = true;\n');
  await writeJson(join(webDir, 'preview-manifest.json'), {
    title: 'Veloria — Veille des Lames',
    preview_url: workspace.preview_url,
    gdl: '../../05_runtime/gdl/veloria.preview.gdl.json',
    resolution: [720, 1280],
  });
  await writeJson(gdlPath, gdl);

  for (let index = 1; index <= 6; index += 1) {
    await write(join(workspaceDir, '03_assets', 'environments', `arena-${index}.png`), pngHeader(720, 1280));
  }
  await write(join(workspaceDir, '03_assets', 'characters', 'heroines', 'aureline.png'), pngHeader(128, 256));
  await write(join(workspaceDir, '03_assets', 'characters', 'enemies', 'fallen_knight.png'), pngHeader(128, 256));
  await write(join(workspaceDir, '03_assets', 'characters', 'bosses', 'bourreau.png'), pngHeader(256, 384));

  return { root, workspaceDir, webDir, gdlPath, reportPath, workspace, gdl };
}

async function removeFixture(root) {
  const absolute = resolve(root);
  assert.equal(dirname(absolute), resolve(tmpdir()));
  assert.match(basename(absolute), /^ellipse-veloria-verify-/u);
  await rm(absolute, { recursive: true, force: true });
}

test('un flagship conforme passe les sept checks et ecrit le rapport attendu', async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture.root));

  const report = await verifyVeloriaHd({
    root: fixture.root,
    now: () => '2026-07-16T00:00:00.000Z',
  });

  assert.equal(report.ok, true);
  assert.deepEqual(report.summary, { total: 7, passed: 7, failed: 0 });
  assert.equal(report.generated_at, '2026-07-16T00:00:00.000Z');
  const persisted = JSON.parse(await readFile(fixture.reportPath, 'utf8'));
  assert.equal(persisted.status, 'pass');
  assert.equal(persisted.checks.find(({ id }) => id === 'backgrounds.hd_png').evidence.count, 6);
});

test('les sept contrats echouent explicitement et le CLI retourne 1', async (context) => {
  const fixture = await createFixture();
  context.after(() => removeFixture(fixture.root));

  fixture.workspace.preview_url = `/workspaces/${SLUG}/05_runtime/index.html`;
  await writeJson(join(fixture.workspaceDir, 'workspace.json'), fixture.workspace);
  await unlink(join(fixture.webDir, 'engine', 'ellipse-engine.js'));
  await write(join(fixture.webDir, 'preview.js'), "const hud_overlay = '03_assets/integrated/combat.png';\n");
  fixture.gdl.meta.resolution = [640, 960];
  fixture.gdl.scenes = fixture.gdl.scenes.slice(0, 5);
  fixture.gdl.meta.asset_atlas.fallen_knight = `/workspaces/${SLUG}/03_assets/characters/enemies/missing.png`;
  fixture.gdl.scenes[0].background.image = `/workspaces/${SLUG}/03_assets/integrated/combat.png`;
  await writeJson(fixture.gdlPath, fixture.gdl);
  await write(join(fixture.workspaceDir, '03_assets', 'integrated', 'combat.png'), pngHeader(640, 960));

  const report = await verifyVeloriaHd({ root: fixture.root });
  assert.equal(report.ok, false);
  assert.equal(report.summary.failed, 7);
  assert.deepEqual(
    report.checks.filter(({ status }) => status === 'fail').map(({ id }) => id),
    [
      'workspace.preview_url',
      'engine.bundle',
      'preview.flagship_sources',
      'gdl.contract',
      'backgrounds.hd_png',
      'atlas.runtime_sprites',
      'scenes.no_integrated_asset',
    ],
  );

  const cli = spawnSync(process.execPath, [SCRIPT_PATH], {
    cwd: fixture.root,
    encoding: 'utf8',
  });
  assert.equal(cli.status, 1, `${cli.stdout}\n${cli.stderr}`);
  assert.match(cli.stdout, /Veloria HD: FAIL/u);
  const persisted = JSON.parse(await readFile(fixture.reportPath, 'utf8'));
  assert.equal(persisted.status, 'fail');
});
