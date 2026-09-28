#!/usr/bin/env node
/** Build reproductible du livrable flagship Veloria. */
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { generateFaithfulHdAssets } from './lib/veloria/faithful-hd.mjs';
import { generateVeloriaIntegratedScene } from './lib/veloria/integrated-scene.mjs';
import { buildFaithfulHdPlaybook } from './lib/veloria/faithful-playbook.mjs';
import { buildVeloriaGdl } from './lib/veloria/gdl-assembler.mjs';
import { buildVeloriaPreviewFiles, VELORIA_PREVIEW_MODE } from './lib/veloria/preview.mjs';
import { buildEngineBrowserBundle } from './lib/engine-preview/build-browser-bundle.mjs';
import { verifyVeloriaHd } from './verify-veloria-hd.mjs';
import { PROJECT_ID, PROJECT_SLUG, PROJECT_TITLE, WORKSPACE_ROOT } from './lib/veloria/constants.mjs';

const LEGACY_RUNTIME_ENTRIES = [
  'assets',
  'audio.js',
  'campaign.js',
  'game.gdl.json',
  'index.html',
  'logic.js',
  'main.js',
  'render.js',
  'skeleton.js',
];

const CURRENT_MANIFESTS = new Set([
  'faithful-hd-build.json',
  'priority-hd-verification.json',
  'flagship-deliverable.json',
]);

async function listFiles(root) {
  const files = [];
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return files;
    throw error;
  }
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

async function replaceArchivedFile(source, destination) {
  await mkdir(dirname(destination), { recursive: true });
  await rm(destination, { recursive: true, force: true });
  await rename(source, destination);
}

async function archiveLegacyOperationalFiles() {
  const opsRoot = join(WORKSPACE_ROOT, '08_ops');
  const manifestsDir = join(opsRoot, 'manifests');
  const archiveRoot = join(opsRoot, 'archive', 'pre-specialized-runtime');
  const archiveManifests = join(archiveRoot, 'manifests');
  await Promise.all([
    mkdir(manifestsDir, { recursive: true }),
    mkdir(archiveManifests, { recursive: true }),
  ]);

  for (const entry of await readdir(manifestsDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (CURRENT_MANIFESTS.has(entry.name)) {
      if (entry.name !== 'flagship-deliverable.json') continue;
      try {
        const current = JSON.parse(await readFile(join(manifestsDir, entry.name), 'utf8'));
        if (current?.deliverable?.status === 'playable_hd') continue;
      } catch {
        // An invalid or retired flagship manifest is archived below.
      }
    }
    await replaceArchivedFile(join(manifestsDir, entry.name), join(archiveManifests, entry.name));
  }

  const legacyExperience = join(opsRoot, 'game-experience-report.json');
  try {
    await replaceArchivedFile(legacyExperience, join(archiveRoot, 'game-experience-report.json'));
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  const knowledgeIndex = join(opsRoot, 'knowledge', 'index.json');
  try {
    await replaceArchivedFile(knowledgeIndex, join(archiveRoot, 'knowledge', 'index.json'));
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  const assetsRoot = join(WORKSPACE_ROOT, '03_assets');
  for (const source of await listFiles(assetsRoot)) {
    const assetPath = relative(assetsRoot, source).replaceAll('\\', '/');
    const isStaleQa = /\/07_qa\/(?:qa-report|silhouette-diff-report)\.json$/u.test(`/${assetPath}`);
    const isStaleRuntimeManifest = /\/06_exports\/runtime-manifest\.json$/u.test(`/${assetPath}`);
    if (!isStaleQa && !isStaleRuntimeManifest) continue;
    await replaceArchivedFile(source, join(archiveRoot, 'asset-qa', assetPath));
  }

  const specsRoot = join(WORKSPACE_ROOT, '02_design', 'specs');
  for (const name of ['veloria-forge-pipeline.md', 'veloria-meta-economy.md']) {
    try {
      await replaceArchivedFile(join(specsRoot, name), join(archiveRoot, 'design', name));
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }

  await writeFile(
    join(archiveRoot, 'README.md'),
    '# Rapports historiques Veloria\n\nCes fichiers concernent les anciens runtimes Forge/Canvas ou des assets antérieurs au rebuild HD. Ils ne certifient pas le flagship Pixi actuel. Les seuls manifestes actifs sont ceux de `08_ops/manifests`.\n',
    'utf8',
  );
  return manifestsDir;
}

export async function buildVeloriaHd() {
  console.log('══════════════════════════════════════════════════════');
  console.log('  VELORIA — FLAGSHIP HD, RUNTIME UNIQUE');
  console.log('══════════════════════════════════════════════════════\n');
  const startedAt = Date.now();

  const assetManifest = await generateFaithfulHdAssets((step) => console.log('  ·', step));
  const goldenReference = await generateVeloriaIntegratedScene();
  console.log('  · golden reference isolée du runtime');

  const gdl = await buildVeloriaGdl();
  const runtimeDir = join(WORKSPACE_ROOT, '05_runtime');
  await Promise.all(
    LEGACY_RUNTIME_ENTRIES.map((entry) => rm(join(runtimeDir, entry), { recursive: true, force: true })),
  );
  const gdlDir = join(runtimeDir, 'gdl');
  await mkdir(gdlDir, { recursive: true });
  await writeFile(join(gdlDir, 'veloria.preview.gdl.json'), JSON.stringify(gdl, null, 2), 'utf8');
  console.log('  · GDL 6 arènes synchronisé');

  const webDir = join(WORKSPACE_ROOT, '07_exports', 'web');
  // Keep the flagship export atomic: no retired Forge/meta renderer may
  // survive in the directory served to players.
  await rm(webDir, { recursive: true, force: true });
  await mkdir(webDir, { recursive: true });
  const preview = await buildVeloriaPreviewFiles();
  await Promise.all([
    writeFile(join(webDir, 'preview.html'), preview.html, 'utf8'),
    writeFile(join(webDir, 'preview.css'), preview.css, 'utf8'),
    writeFile(join(webDir, 'preview.js'), preview.js, 'utf8'),
  ]);
  await buildEngineBrowserBundle(webDir);
  await writeFile(
    join(webDir, 'preview-manifest.json'),
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        title: PROJECT_TITLE,
        slug: PROJECT_SLUG,
        flagship: true,
        mode: VELORIA_PREVIEW_MODE,
        preview_url: `/workspaces/${PROJECT_SLUG}/07_exports/web/preview.html`,
        gdl: '../../05_runtime/gdl/veloria.preview.gdl.json',
        orientation: 'portrait',
        resolution: [720, 1280],
      },
      null,
      2,
    ),
    'utf8',
  );
  console.log('  · bundle Pixi et preview web reconstruits');

  const playbookDir = join(WORKSPACE_ROOT, '02_design', 'specs');
  await mkdir(playbookDir, { recursive: true });
  await writeFile(join(playbookDir, 'agent-faithful-hd-playbook.md'), buildFaithfulHdPlaybook(), 'utf8');

  const workspacePath = join(WORKSPACE_ROOT, 'workspace.json');
  const workspace = JSON.parse(await readFile(workspacePath, 'utf8'));
  workspace.title = PROJECT_TITLE;
  workspace.status = 'playable_hd';
  workspace.updated_at = new Date().toISOString();
  workspace.runtime = VELORIA_PREVIEW_MODE;
  workspace.preview_url = `/workspaces/${PROJECT_SLUG}/07_exports/web/preview.html`;
  workspace.gdl_url = `/workspaces/${PROJECT_SLUG}/05_runtime/gdl/veloria.preview.gdl.json`;
  delete workspace.forge;
  delete workspace.experience;
  delete workspace.legacy_preview_url;
  await writeFile(workspacePath, JSON.stringify(workspace, null, 2), 'utf8');

  const opsDir = await archiveLegacyOperationalFiles();
  const buildManifest = {
    ...assetManifest,
    golden_reference: goldenReference.reference,
    runtime: {
      web: workspace.preview_url,
      mode: VELORIA_PREVIEW_MODE,
      renderer: 'preview.js',
      bundle: 'engine/ellipse-engine.js',
      gdl: workspace.gdl_url,
      legacy_forge_shipping: false,
      legacy_canvas_shipping: false,
    },
  };
  await writeFile(join(opsDir, 'faithful-hd-build.json'), JSON.stringify(buildManifest, null, 2), 'utf8');

  const verification = await verifyVeloriaHd();
  if (!verification.ok) {
    const failures = verification.checks
      .filter((check) => check.status === 'fail')
      .map((check) => `${check.id}: ${check.error}`)
      .join('\n');
    throw new Error(`Gate Veloria HD refusé (${verification.summary.passed}/${verification.summary.total})\n${failures}`);
  }
  console.log(`  · gate flagship HD : ${verification.summary.passed}/${verification.summary.total}`);

  const deliveryManifest = {
    generated_at: new Date().toISOString(),
    mission: 'ellipse_flagship_delivery',
    game: {
      id: PROJECT_ID,
      slug: PROJECT_SLUG,
      title: PROJECT_TITLE,
      genre: 'survivors_like',
      dimension: '2.5d',
      orientation: 'portrait',
    },
    deliverable: {
      status: 'playable_hd',
      commercial_ready: false,
      static_gate: verification.status,
      checks: `${verification.summary.passed}/${verification.summary.total}`,
      preview_url: workspace.preview_url,
      gdl_url: workspace.gdl_url,
      runtime: VELORIA_PREVIEW_MODE,
      remaining_release_gates: [
        'golden screenshots composed in a real browser',
        'side-by-side art-direction review',
        'touch and performance validation on target devices',
      ],
    },
    commands: {
      rebuild: 'pnpm veloria:hd',
      verify: 'pnpm veloria:verify-hd',
      play: 'pnpm veloria:serve',
    },
  };
  await writeFile(join(opsDir, 'flagship-deliverable.json'), `${JSON.stringify(deliveryManifest, null, 2)}\n`, 'utf8');

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\n  Terminé (${elapsed}s) — un seul runtime flagship`);
  console.log(`  Preview : ${workspace.preview_url}`);
  return { gdl, assetManifest, buildManifest, deliveryManifest, verification, webDir };
}

const isMain = process.argv[1]?.replace(/\\/g, '/').endsWith('/build-veloria-hd.mjs');
if (isMain) {
  buildVeloriaHd().catch((error) => {
    console.error('ÉCHEC build Veloria HD:', error);
    process.exitCode = 1;
  });
}
