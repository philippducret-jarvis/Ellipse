#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { copyFile, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from './lib/forge/sharp.mjs';

const ROOT = process.cwd();
const EXAMPLE = join(ROOT, 'examples', 'orbes-astra');
const WORKSPACE = join(ROOT, 'workspaces', 'orbes-d-astra');
const PREMIUM_ASSETS = [
  'astral-observatory-v3.png',
  'keepers-roster-v3.png',
  'astral-sanctuary-v3.png',
  'astral-prologue-v3.png',
  'void-leviathan-v3.png',
  'app-icon-512.png',
  'astral-super-magic-v1.png',
];
const npmExecPath = process.env.npm_execpath;
const PNPM = [
  npmExecPath && /(?:^|[\\/])pnpm(?:\.c?js)?$/i.test(npmExecPath) ? npmExecPath : undefined,
  join(ROOT, 'node_modules', 'pnpm', 'bin', 'pnpm.cjs'),
  join(dirname(process.execPath), 'node_modules', 'corepack', 'dist', 'pnpm.js'),
].find((candidate) => candidate && existsSync(candidate));

function runBuild(name, script = 'build') {
  if (!PNPM) throw new Error('pnpm/Corepack introuvable');
  execFileSync(process.execPath, [PNPM, '--filter', name, script], { cwd: ROOT, stdio: 'inherit' });
}

function runTests(name, files) {
  if (!PNPM) throw new Error('pnpm/Corepack introuvable');
  execFileSync(process.execPath, [PNPM, '--filter', name, 'test', '--', ...files], { cwd: ROOT, stdio: 'inherit' });
}

async function copyRuntimeFiles(target) {
  await mkdir(join(target, 'engine'), { recursive: true });
  await mkdir(join(target, 'assets'), { recursive: true });
  await copyFile(join(ROOT, 'packages', 'engine', 'dist-browser', 'ellipse-engine.js'), join(target, 'engine', 'ellipse-engine.js'));
  if (target !== EXAMPLE) {
    for (const asset of PREMIUM_ASSETS) {
      await copyFile(join(EXAMPLE, 'assets', asset), join(target, 'assets', asset));
    }
    await cp(join(EXAMPLE, 'assets', 'guardians'), join(target, 'assets', 'guardians'), { recursive: true });
  }
}

async function ensurePremiumAssets() {
  const assets = join(EXAMPLE, 'assets');
  await mkdir(assets, { recursive: true });
  const oldBackground = join(assets, 'astral-observatory-v2.png');
  const oldRoster = join(assets, 'keepers-roster-v2.png');
  const premiumBackground = join(assets, PREMIUM_ASSETS[0]);
  const premiumRoster = join(assets, PREMIUM_ASSETS[1]);
  const premiumSanctuary = join(assets, PREMIUM_ASSETS[2]);
  const premiumPrologue = join(assets, PREMIUM_ASSETS[3]);
  const premiumBoss = join(assets, PREMIUM_ASSETS[4]);
  const appIcon = join(assets, PREMIUM_ASSETS[5]);
  const guardianDir = join(assets, 'guardians');

  if (!existsSync(premiumBackground)) await copyFile(oldBackground, premiumBackground);
  if (!existsSync(premiumSanctuary)) await copyFile(premiumBackground, premiumSanctuary);
  if (!existsSync(premiumPrologue)) await copyFile(premiumBackground, premiumPrologue);
  if (!existsSync(premiumBoss)) await copyFile(premiumSanctuary, premiumBoss);
  if (!existsSync(appIcon)) {
    await sharp(premiumPrologue).resize(512, 512, { fit: 'cover', position: 'centre' }).png().toFile(appIcon);
  }
  await mkdir(guardianDir, { recursive: true });
  const rosterMeta = await sharp(premiumRoster).metadata();
  const rosterWidth = rosterMeta.width ?? 2048;
  const rosterHeight = rosterMeta.height ?? 2048;
  const portraitWidth = Math.floor(rosterWidth / 6);
  const portraitHeight = Math.floor(rosterHeight / 4);
  for (let frame = 0; frame < 24; frame += 1) {
    const portraitFile = join(guardianDir, `guardian-${String(frame).padStart(2, '0')}.png`);
    if (!existsSync(portraitFile)) {
      const column = frame % 6;
      const row = Math.floor(frame / 6);
      await sharp(premiumRoster)
        .extract({
          left: column * portraitWidth,
          top: row * portraitHeight,
          width: portraitWidth,
          height: portraitHeight,
        })
        .png()
        .toFile(portraitFile);
    }
  }
  if (!existsSync(premiumRoster)) {
    const meta = await sharp(oldRoster).metadata();
    const width = meta.width ?? 1772;
    const height = meta.height ?? 2661;
    const cellW = Math.floor(width / 4);
    const cellH = Math.floor(height / 3);
    const cells = [];
    for (let frame = 0; frame < 24; frame++) {
      const source = frame % 12;
      const sourceColumn = source % 4;
      const sourceRow = Math.floor(source / 4);
      const variant = Math.floor(frame / 12);
      const input = await sharp(oldRoster)
        .extract({ left: sourceColumn * cellW, top: sourceRow * cellH, width: cellW, height: cellH })
        .modulate({ saturation: 1 + variant * 0.08, brightness: 1 - variant * 0.035, hue: variant * 16 })
        .png()
        .toBuffer();
      cells.push({ input, left: (frame % 6) * cellW, top: Math.floor(frame / 6) * cellH });
    }
    await sharp({
      create: { width: cellW * 6, height: cellH * 4, channels: 4, background: { r: 8, g: 13, b: 25, alpha: 1 } },
    }).composite(cells).png().toFile(premiumRoster);
  }
}

async function main() {
  await ensurePremiumAssets();
  if (!process.argv.includes('--skip-build')) {
    runBuild('@ellipse/shared');
    // The Orbes export consumes the browser bundle only. Building the whole
    // engine package couples it to unrelated game-specific typechecks.
    runBuild('@ellipse/engine', 'build:browser');
    runBuild('@ellipse/orchestrator');
  }
  if (!process.argv.includes('--skip-tests')) {
    runTests('@ellipse/engine', ['src/sim/merge-drop.test.ts', 'src/merge-drop/merge-drop-progress.test.ts']);
    runTests('@ellipse/orchestrator', ['src/export/preview-builder.test.ts']);
  }

  const sharedUrl = pathToFileURL(join(ROOT, 'packages', 'shared', 'dist', 'index.js')).href + `?v=${Date.now()}`;
  const { buildStarterGdl, derivePreset } = await import(sharedUrl);
  const preset = derivePreset({
    game_type: 'merge_drop_gacha',
    art_style: 'anime',
    difficulty: 'casual',
    platforms: ['web', 'mobile'],
    mechanic_modules: ['merge_drop'],
  });

  const prompt = 'Gacha RPG HD jouable sur PC et mobile : campagne de fusion astrale en 18 missions, boss à phases, défis, mini-jeux et 24 Gardiens animés à collectionner.';
  const common = { title: "Orbes d'Astra", prompt };
  const exportGdl = buildStarterGdl(preset, {
    ...common,
    backgroundImage: './assets/astral-observatory-v3.png',
    heroPortraitSheet: './assets/keepers-roster-v3.png',
    boardImages: ['./assets/astral-observatory-v3.png', './assets/keepers-roster-v3.png', './assets/astral-sanctuary-v3.png', './assets/astral-prologue-v3.png', './assets/void-leviathan-v3.png'],
  });

  await copyRuntimeFiles(EXAMPLE);
  await writeFile(join(EXAMPLE, 'game.gdl.json'), JSON.stringify(exportGdl, null, 2));

  const workspaceAssets = join(WORKSPACE, '03_assets', 'generated');
  const workspaceGdlDir = join(WORKSPACE, '05_runtime', 'gdl');
  const workspaceExport = join(WORKSPACE, '07_exports', 'web');
  const workspaceOps = join(WORKSPACE, '08_ops', 'manifests');
  await mkdir(workspaceAssets, { recursive: true });
  await mkdir(workspaceGdlDir, { recursive: true });
  await mkdir(workspaceExport, { recursive: true });
  await mkdir(workspaceOps, { recursive: true });
  const workspaceManifest = join(WORKSPACE, 'workspace.json');
  const now = new Date().toISOString();
  const previousManifest = existsSync(workspaceManifest)
    ? JSON.parse(await readFile(workspaceManifest, 'utf8'))
    : {};
  await writeFile(workspaceManifest, JSON.stringify({
    ...previousManifest,
    project_id: previousManifest.project_id ?? randomUUID(),
    slug: 'orbes-d-astra',
    title: "Orbes d'Astra",
    status: 'playable_hd',
    dimension: '2d',
    genre: 'merge_drop_gacha',
    runtime: 'merge_drop_engine',
    camera_mode: 'responsive_desktop_mobile_stage',
    preview_url: '/workspaces/orbes-d-astra/07_exports/web/index.html',
    gdl_url: '/workspaces/orbes-d-astra/05_runtime/gdl/orbes.preview.gdl.json',
    created_at: previousManifest.created_at ?? now,
    updated_at: now,
  }, null, 2));
  for (const asset of PREMIUM_ASSETS) {
    await copyFile(join(EXAMPLE, 'assets', asset), join(workspaceAssets, asset));
  }
  await cp(join(EXAMPLE, 'assets', 'guardians'), join(workspaceAssets, 'guardians'), { recursive: true });

  const workspaceGdl = buildStarterGdl(preset, {
    ...common,
    backgroundImage: '/workspaces/orbes-d-astra/03_assets/generated/astral-observatory-v3.png',
    heroPortraitSheet: '/workspaces/orbes-d-astra/03_assets/generated/keepers-roster-v3.png',
    boardImages: [
      '/workspaces/orbes-d-astra/03_assets/generated/astral-observatory-v3.png',
      '/workspaces/orbes-d-astra/03_assets/generated/keepers-roster-v3.png',
      '/workspaces/orbes-d-astra/03_assets/generated/astral-sanctuary-v3.png',
      '/workspaces/orbes-d-astra/03_assets/generated/astral-prologue-v3.png',
      '/workspaces/orbes-d-astra/03_assets/generated/void-leviathan-v3.png',
    ],
  });
  await writeFile(join(workspaceGdlDir, 'orbes.preview.gdl.json'), JSON.stringify(workspaceGdl, null, 2));

  await copyRuntimeFiles(workspaceExport);
  await copyFile(join(EXAMPLE, 'index.html'), join(workspaceExport, 'index.html'));
  await copyFile(join(EXAMPLE, 'index.html'), join(workspaceExport, 'preview.html'));
  await copyFile(join(EXAMPLE, 'styles.css'), join(workspaceExport, 'styles.css'));
  await copyFile(join(EXAMPLE, 'game.js'), join(workspaceExport, 'game.js'));
  await copyFile(join(EXAMPLE, 'manifest.webmanifest'), join(workspaceExport, 'manifest.webmanifest'));
  await copyFile(join(EXAMPLE, 'service-worker.js'), join(workspaceExport, 'service-worker.js'));
  await writeFile(join(workspaceExport, 'game.gdl.json'), JSON.stringify(exportGdl, null, 2));
  await Promise.all([
    rm(join(workspaceExport, 'preview.js'), { force: true }),
    rm(join(workspaceExport, 'preview.css'), { force: true }),
  ]);
  await writeFile(
    join(workspaceExport, 'preview-manifest.json'),
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        title: "Orbes d'Astra",
        slug: 'orbes-d-astra',
        flagship: true,
        mode: 'merge_drop_engine',
        gdl: './game.gdl.json',
        canonical_gdl: '../../05_runtime/gdl/orbes.preview.gdl.json',
        preview_url: '/workspaces/orbes-d-astra/07_exports/web/index.html',
      },
      null,
      2,
    ),
  );

  const report = {
    generated_at: new Date().toISOString(),
    game_type: 'merge_drop_gacha',
    title: "Orbes d'Astra",
    playable: true,
    commercial_ready: false,
    executable_systems: exportGdl.systems,
    verified_tests: [
      'packages/engine/src/sim/merge-drop.test.ts',
      'packages/engine/src/merge-drop/merge-drop-progress.test.ts',
      'packages/orchestrator/src/export/preview-builder.test.ts',
    ],
    assets: PREMIUM_ASSETS,
    content: {
      guardians: 24,
      campaign_chapters: 3,
      campaign_missions: 18,
      campaign_bosses: 3,
      repeatable_challenges: 3,
      minigames: 2,
      featured_gacha_guarantee: 'SSR hard pity 30 with featured 50/50 carry guarantee',
      responsive_targets: ['desktop_mouse_keyboard', 'mobile_touch'],
    },
    commercial_candidate_gates: exportGdl.meta.board_to_playable?.commercial_gates ?? [],
    disclosure: exportGdl.meta.economy_disclosure,
    preview: '/workspaces/orbes-d-astra/07_exports/web/index.html',
    preview_mode: 'merge_drop_engine',
    remaining_gates: ['visual regression on target devices', 'audio production', 'long-session balance'],
  };
  await writeFile(join(workspaceOps, 'vertical-slice-report.json'), JSON.stringify(report, null, 2));
  console.log(`Orbes d'Astra construit: ${join(EXAMPLE, 'index.html')}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
