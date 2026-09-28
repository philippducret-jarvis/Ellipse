#!/usr/bin/env node

import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const VELORIA_SLUG = 'veloria-veille-des-lames';
const EXPECTED_TITLE = 'Veloria — Veille des Lames';
const REPORT_RELATIVE_PATH = join('08_ops', 'manifests', 'priority-hd-verification.json');
const EXPECTED_WIDTH = 720;
const EXPECTED_HEIGHT = 1280;
const EXPECTED_SCENES = 6;
const EXPECTED_LANES = 3;
const EXPECTED_WAVES = 12;
const EXPECTED_DIMENSION = '2.5d';
const FORBIDDEN_PREVIEW_TOKENS = ['hud_overlay', 'combat_arena_integrated', 'gacha-preview'];
const FORBIDDEN_SHIPPING_FILES = [
  'forge-runtime.js',
  'gacha-renderer.js',
  'meta-manifest.json',
  'meta-screens.js',
  'veloria-meta.js',
  'veloria-systems.js',
];
const FORBIDDEN_RUNTIME_ENTRIES = [
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
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function toPosix(path) {
  return path.replaceAll('\\', '/');
}

function cleanReference(reference) {
  invariant(typeof reference === 'string' && reference.trim(), 'reference asset/GDL absente');
  const withoutSuffix = reference.trim().split(/[?#]/u, 1)[0];
  try {
    return decodeURIComponent(withoutSuffix).replaceAll('\\', '/');
  } catch {
    throw new Error(`reference URL invalide: ${reference}`);
  }
}

function ensureContained(path, parent, label) {
  const rel = relative(resolve(parent), resolve(path));
  invariant(rel !== '..' && !rel.startsWith('../') && !rel.startsWith('..\\'), `${label} sort du workspace: ${path}`);
  return resolve(path);
}

function resolveReference(reference, { root, workspaceDir, baseDir = workspaceDir }) {
  const cleaned = cleanReference(reference);
  invariant(!/^(?:data|blob|https?):/iu.test(cleaned), `reference externe interdite: ${reference}`);

  let resolved;
  if (cleaned.startsWith('/workspaces/')) resolved = resolve(root, cleaned.slice(1));
  else if (cleaned.startsWith('workspaces/')) resolved = resolve(root, cleaned);
  else if (cleaned.startsWith('/')) resolved = resolve(root, cleaned.slice(1));
  else if (/^(?:\.\/)?(?:0[0-9]_)?assets\//iu.test(cleaned) || cleaned.startsWith('03_assets/')) {
    resolved = resolve(workspaceDir, cleaned.replace(/^\.\//u, ''));
  } else resolved = resolve(baseDir, cleaned);

  return ensureContained(resolved, workspaceDir, 'La reference');
}

async function readJson(path, label) {
  let source;
  try {
    source = await readFile(path, 'utf8');
  } catch (error) {
    throw new Error(`${label} illisible (${path}): ${error.code ?? error.message}`);
  }
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`${label} JSON invalide (${path}): ${error.message}`);
  }
}

async function requireFile(path, label) {
  let info;
  try {
    info = await stat(path);
  } catch (error) {
    throw new Error(`${label} absent (${path}): ${error.code ?? error.message}`);
  }
  invariant(info.isFile(), `${label} n'est pas un fichier: ${path}`);
  invariant(info.size > 0, `${label} est vide: ${path}`);
  return info;
}

async function readPngDimensions(path) {
  const data = await readFile(path);
  invariant(data.length >= 24, `PNG tronque: ${path}`);
  invariant(data.subarray(0, 8).equals(PNG_SIGNATURE), `signature PNG invalide: ${path}`);
  invariant(data.toString('ascii', 12, 16) === 'IHDR', `chunk IHDR PNG absent: ${path}`);
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

function collectStrings(value, pointer = '$', result = []) {
  if (typeof value === 'string') result.push({ pointer, value });
  else if (Array.isArray(value)) value.forEach((item, index) => collectStrings(item, `${pointer}[${index}]`, result));
  else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) collectStrings(item, `${pointer}.${key}`, result);
  }
  return result;
}

function encounterSpriteKeys(scenes) {
  const keys = new Set();
  for (const scene of scenes) {
    const encounters = scene?.veloria?.encounters;
    if (typeof encounters?.heroine_default === 'string') keys.add(encounters.heroine_default);
    for (const wave of encounters?.waves ?? []) {
      for (const enemy of wave.enemies ?? []) if (typeof enemy?.type === 'string') keys.add(enemy.type);
      for (const add of wave.adds ?? []) if (typeof add?.type === 'string') keys.add(add.type);
      if (typeof wave.boss?.type === 'string') keys.add(wave.boss.type);
    }
  }
  return keys;
}

function entitiesAsArray(entities) {
  if (Array.isArray(entities)) return entities;
  if (entities && typeof entities === 'object') return Object.values(entities);
  return [];
}

async function runCheck(checks, id, label, action) {
  try {
    const evidence = await action();
    checks.push({ id, label, status: 'pass', evidence: evidence ?? null });
  } catch (error) {
    checks.push({ id, label, status: 'fail', error: error.message ?? String(error) });
  }
}

/**
 * Verifie le contrat flagship HD de Veloria et ecrit toujours un rapport JSON.
 * La fonction retourne le rapport; seul le point d'entree CLI fixe le code de sortie.
 */
export async function verifyVeloriaHd({
  root = process.cwd(),
  workspaceDir = join(root, 'workspaces', VELORIA_SLUG),
  reportPath = join(workspaceDir, REPORT_RELATIVE_PATH),
  now = () => new Date().toISOString(),
  writeReport = true,
} = {}) {
  root = resolve(root);
  workspaceDir = resolve(workspaceDir);
  reportPath = resolve(reportPath);

  const webDir = join(workspaceDir, '07_exports', 'web');
  const workspacePath = join(workspaceDir, 'workspace.json');
  const enginePath = join(webDir, 'engine', 'ellipse-engine.js');
  const previewJsPath = join(webDir, 'preview.js');
  const previewManifestPath = join(webDir, 'preview-manifest.json');
  const checks = [];

  let workspacePromise;
  let previewManifestPromise;
  let gdlContextPromise;

  const getWorkspace = () => {
    workspacePromise ??= readJson(workspacePath, 'workspace.json');
    return workspacePromise;
  };
  const getPreviewManifest = () => {
    previewManifestPromise ??= readJson(previewManifestPath, 'preview-manifest.json');
    return previewManifestPromise;
  };
  const getGdlContext = () => {
    gdlContextPromise ??= (async () => {
      const manifest = await getPreviewManifest();
      const gdlPath = resolveReference(manifest.gdl, { root, workspaceDir, baseDir: webDir });
      const gdl = await readJson(gdlPath, 'GDL flagship');
      return { manifest, gdl, gdlPath };
    })();
    return gdlContextPromise;
  };

  await runCheck(checks, 'workspace.preview_url', 'La preview principale cible 07_exports/web', async () => {
    const workspace = await getWorkspace();
    invariant(workspace.slug === VELORIA_SLUG, `slug workspace inattendu: ${workspace.slug ?? 'absent'}`);
    invariant(workspace.title === EXPECTED_TITLE, `titre workspace inattendu: ${workspace.title ?? 'absent'}`);
    const previewPath = resolveReference(workspace.preview_url, { root, workspaceDir });
    const relativePreview = toPosix(relative(workspaceDir, previewPath));
    invariant(relativePreview.startsWith('07_exports/web/'), `preview_url cible ${relativePreview}, attendu 07_exports/web/*`);
    invariant(extname(previewPath).toLowerCase() === '.html', `preview_url ne cible pas un fichier HTML: ${workspace.preview_url}`);
    await requireFile(previewPath, 'HTML flagship');
    return { title: workspace.title, preview_url: workspace.preview_url, file: relativePreview };
  });

  await runCheck(checks, 'engine.bundle', 'Le bundle Ellipse Engine est livre', async () => {
    const info = await requireFile(enginePath, 'engine/ellipse-engine.js');
    return { file: toPosix(relative(workspaceDir, enginePath)), bytes: info.size };
  });

  await runCheck(checks, 'preview.flagship_sources', 'preview.js est le flagship et exclut les sources interdites', async () => {
    const workspace = await getWorkspace();
    const previewPath = resolveReference(workspace.preview_url, { root, workspaceDir });
    const html = await readFile(previewPath, 'utf8');
    const source = await readFile(previewJsPath, 'utf8');
    invariant(/<script\b[^>]*\bsrc=["'](?:\.\/)?preview\.js(?:[?#][^"']*)?["']/iu.test(html), 'la preview flagship ne charge pas preview.js');
    const lowered = source.toLowerCase();
    const forbidden = FORBIDDEN_PREVIEW_TOKENS.filter((token) => lowered.includes(token));
    invariant(!forbidden.length, `tokens interdits dans preview.js: ${forbidden.join(', ')}`);
    const shippedNames = await readdir(webDir);
    const legacyFiles = FORBIDDEN_SHIPPING_FILES.filter((file) => shippedNames.includes(file));
    invariant(!legacyFiles.length, `anciens runtimes encore livres: ${legacyFiles.join(', ')}`);
    const legacyRuntimeEntries = [];
    for (const entry of FORBIDDEN_RUNTIME_ENTRIES) {
      try {
        await stat(join(workspaceDir, '05_runtime', entry));
        legacyRuntimeEntries.push(entry);
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }
    }
    invariant(!legacyRuntimeEntries.length, `ancien runtime 05_runtime encore livre: ${legacyRuntimeEntries.join(', ')}`);
    return {
      file: toPosix(relative(workspaceDir, previewJsPath)),
      forbidden_tokens: FORBIDDEN_PREVIEW_TOKENS,
      forbidden_shipping_files: FORBIDDEN_SHIPPING_FILES,
      forbidden_runtime_entries: FORBIDDEN_RUNTIME_ENTRIES,
    };
  });

  await runCheck(checks, 'gdl.contract', 'Le GDL est 720x1280 avec 6 scenes, 3 lanes et 12 vagues', async () => {
    const { manifest, gdl, gdlPath } = await getGdlContext();
    const workspace = await getWorkspace();
    const problems = [];
    if (manifest?.title !== EXPECTED_TITLE) {
      problems.push(`preview-manifest.title=${JSON.stringify(manifest?.title)}, attendu ${EXPECTED_TITLE}`);
    }
    if (gdl?.meta?.title !== EXPECTED_TITLE) {
      problems.push(`meta.title=${JSON.stringify(gdl?.meta?.title)}, attendu ${EXPECTED_TITLE}`);
    }
    if (manifest?.preview_url !== workspace.preview_url) {
      problems.push(`preview-manifest.preview_url=${JSON.stringify(manifest?.preview_url)}, attendu ${workspace.preview_url}`);
    }
    if (gdl?.meta?.dimension !== EXPECTED_DIMENSION) {
      problems.push(`meta.dimension=${JSON.stringify(gdl?.meta?.dimension)}, attendu ${EXPECTED_DIMENSION}`);
    }
    const resolution = gdl?.meta?.resolution;
    if (!Array.isArray(resolution) || resolution[0] !== EXPECTED_WIDTH || resolution[1] !== EXPECTED_HEIGHT) {
      problems.push(`meta.resolution=${JSON.stringify(resolution)}, attendu [${EXPECTED_WIDTH},${EXPECTED_HEIGHT}]`);
    }
    if (!Array.isArray(gdl.scenes) || gdl.scenes.length !== EXPECTED_SCENES) {
      problems.push(`scenes=${gdl.scenes?.length ?? 'absent'}, attendu ${EXPECTED_SCENES}`);
    }

    for (const [index, scene] of (gdl.scenes ?? []).entries()) {
      const id = scene.id ?? `scene[${index}]`;
      if (scene.layout?.width !== EXPECTED_WIDTH || scene.layout?.height !== EXPECTED_HEIGHT) {
        problems.push(`${id}: layout ${scene.layout?.width ?? '?'}x${scene.layout?.height ?? '?'}, attendu ${EXPECTED_WIDTH}x${EXPECTED_HEIGHT}`);
      }
      const laneMeta = scene.layout?.lane_meta;
      if (laneMeta?.count !== EXPECTED_LANES || !Array.isArray(laneMeta?.lanes) || laneMeta.lanes.length !== EXPECTED_LANES) {
        problems.push(`${id}: lanes=${laneMeta?.lanes?.length ?? 'absent'}/count=${laneMeta?.count ?? 'absent'}, attendu ${EXPECTED_LANES}`);
      }
      const encounters = scene.veloria?.encounters;
      if (encounters?.total_waves !== EXPECTED_WAVES
        || !Array.isArray(encounters?.waves)
        || encounters.waves.length !== EXPECTED_WAVES) {
        problems.push(`${id}: vagues=${encounters?.waves?.length ?? 'absent'}/total=${encounters?.total_waves ?? 'absent'}, attendu ${EXPECTED_WAVES}`);
      }
    }
    invariant(!problems.length, problems.join('; '));
    return {
      gdl: toPosix(relative(workspaceDir, gdlPath)),
      title: EXPECTED_TITLE,
      dimension: EXPECTED_DIMENSION,
      resolution: [EXPECTED_WIDTH, EXPECTED_HEIGHT],
      scenes: EXPECTED_SCENES,
      lanes_per_scene: EXPECTED_LANES,
      waves_per_scene: EXPECTED_WAVES,
    };
  });

  await runCheck(checks, 'backgrounds.hd_png', 'Chaque scene possede un fond PNG 720x1280', async () => {
    const { gdl, gdlPath } = await getGdlContext();
    invariant(Array.isArray(gdl.scenes) && gdl.scenes.length, 'aucune scene GDL');
    const backgrounds = [];
    const problems = [];
    for (const [index, scene] of gdl.scenes.entries()) {
      const id = scene.id ?? `scene[${index}]`;
      const reference = scene.background?.layers?.find((layer) => layer?.id === 'arena')?.image
        ?? scene.background?.layers?.[0]?.image
        ?? scene.background?.image;
      try {
        invariant(typeof reference === 'string', `${id}: background.image absent`);
        invariant(extname(cleanReference(reference)).toLowerCase() === '.png', `${id}: fond non PNG (${reference})`);
        const path = resolveReference(reference, { root, workspaceDir, baseDir: dirname(gdlPath) });
        await requireFile(path, `${id} background`);
        const dimensions = await readPngDimensions(path);
        invariant(
          dimensions.width === EXPECTED_WIDTH && dimensions.height === EXPECTED_HEIGHT,
          `${id}: fond ${dimensions.width}x${dimensions.height}, attendu ${EXPECTED_WIDTH}x${EXPECTED_HEIGHT}`,
        );
        backgrounds.push({ scene: id, file: toPosix(relative(workspaceDir, path)), ...dimensions });
      } catch (error) {
        problems.push(error.message ?? String(error));
      }
    }
    invariant(!problems.length, problems.join('; '));
    return { count: backgrounds.length, backgrounds };
  });

  await runCheck(checks, 'atlas.runtime_sprites', 'Les sprites utiles de l atlas existent', async () => {
    const { gdl, gdlPath } = await getGdlContext();
    const atlas = gdl?.meta?.asset_atlas;
    invariant(atlas && typeof atlas === 'object' && !Array.isArray(atlas), 'meta.asset_atlas absent');

    const requiredKeys = encounterSpriteKeys(gdl.scenes ?? []);
    const characterKeys = Object.entries(atlas)
      .filter(([, reference]) => typeof reference === 'string' && /(?:^|\/)characters(?:\/|$)/iu.test(cleanReference(reference)))
      .map(([key]) => key);
    const usefulKeys = new Set([...requiredKeys, ...characterKeys]);
    invariant(usefulKeys.size > 0, 'aucun sprite utile declare dans asset_atlas');

    const sprites = [];
    const problems = [];
    for (const key of [...usefulKeys].sort()) {
      try {
        const reference = atlas[key];
        invariant(typeof reference === 'string', `cle atlas requise absente: ${key}`);
        const path = resolveReference(reference, { root, workspaceDir, baseDir: dirname(gdlPath) });
        const info = await requireFile(path, `sprite atlas ${key}`);
        sprites.push({ key, file: toPosix(relative(workspaceDir, path)), bytes: info.size });
      } catch (error) {
        problems.push(error.message ?? String(error));
      }
    }

    for (const entity of entitiesAsArray(gdl.entities)) {
      const reference = entity?.assets?.sprite;
      if (!reference) continue;
      try {
        const path = resolveReference(reference, { root, workspaceDir, baseDir: dirname(gdlPath) });
        await requireFile(path, `sprite entity ${entity.id ?? 'sans-id'}`);
      } catch (error) {
        problems.push(error.message ?? String(error));
      }
    }

    for (const item of collectStrings(gdl.audio ?? {}, '$.audio')) {
      if (!/\.(?:wav|mp3|ogg|m4a)$/iu.test(cleanReference(item.value))) continue;
      try {
        const path = resolveReference(item.value, { root, workspaceDir, baseDir: dirname(gdlPath) });
        await requireFile(path, `audio ${item.pointer}`);
      } catch (error) {
        problems.push(error.message ?? String(error));
      }
    }

    invariant(!problems.length, problems.join('; '));
    return { count: sprites.length, required_keys: [...requiredKeys].sort(), sprites };
  });

  await runCheck(checks, 'scenes.no_integrated_asset', 'Aucune scene runtime n utilise un asset integre', async () => {
    const { gdl } = await getGdlContext();
    const sceneHits = [];
    for (const [index, scene] of (gdl.scenes ?? []).entries()) {
      for (const item of collectStrings(scene, `$.scenes[${index}]`)) {
        if (/(?:^|[\/_\-.])integrated(?:[\/_\-.]|$)/iu.test(item.value)) sceneHits.push(item);
      }
    }
    const previewSource = await readFile(previewJsPath, 'utf8');
    const previewHits = previewSource.split(/\r?\n/u)
      .map((line, index) => ({ line: index + 1, source: line.trim() }))
      .filter(({ source }) => /(?:^|[\/_\-.])integrated(?:[\/_\-.]|$)/iu.test(source));
    invariant(!sceneHits.length && !previewHits.length, `assets integres detectes: ${JSON.stringify({ sceneHits, previewHits })}`);
    return { scene_references: 0, preview_references: 0 };
  });

  const failed = checks.filter(({ status }) => status === 'fail');
  const report = {
    schema_version: 1,
    generated_at: now(),
    verifier: 'tools/verify-veloria-hd.mjs',
    workspace: VELORIA_SLUG,
    status: failed.length ? 'fail' : 'pass',
    ok: failed.length === 0,
    expected_contract: {
      title: EXPECTED_TITLE,
      resolution: [EXPECTED_WIDTH, EXPECTED_HEIGHT],
      dimension: EXPECTED_DIMENSION,
      scenes: EXPECTED_SCENES,
      lanes_per_scene: EXPECTED_LANES,
      waves_per_scene: EXPECTED_WAVES,
      forbidden_preview_tokens: FORBIDDEN_PREVIEW_TOKENS,
      forbidden_shipping_files: FORBIDDEN_SHIPPING_FILES,
      forbidden_runtime_entries: FORBIDDEN_RUNTIME_ENTRIES,
    },
    summary: { total: checks.length, passed: checks.length - failed.length, failed: failed.length },
    checks,
  };

  if (writeReport) {
    ensureContained(reportPath, workspaceDir, 'Le rapport');
    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }
  return report;
}

async function main(args = process.argv.slice(2)) {
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node tools/verify-veloria-hd.mjs');
    return;
  }
  invariant(args.length === 0, `option inconnue: ${args.join(' ')}`);
  const report = await verifyVeloriaHd();
  console.log(`Veloria HD: ${report.status.toUpperCase()} — ${report.summary.passed}/${report.summary.total} checks`);
  for (const check of report.checks.filter(({ status }) => status === 'fail')) console.error(`- ${check.id}: ${check.error}`);
  if (!report.ok) process.exitCode = 1;
}

const executedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (executedDirectly) {
  main().catch((error) => {
    console.error(`Veloria HD: ERREUR — ${error.message ?? error}`);
    process.exitCode = 1;
  });
}
