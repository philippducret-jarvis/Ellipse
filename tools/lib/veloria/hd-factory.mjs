import { mkdir, copyFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { writeAssetSpecPng } from '../../../packages/pipeline/dist/index.js';
import { buildAtlasGrid } from '../level-01/production-image-utils.mjs';
import { WORKSPACE_ROOT, PUBLIC_WORKSPACE_ROOT } from './constants.mjs';
import { writeJson } from './io.mjs';
import { builderForAsset } from './procedural-builders.mjs';

const CLIPS = {
  character: { idle: 4, run: 4, attack: 3 },
  enemy: { idle: 2, walk: 4, hit: 2 },
  boss: { idle: 2, phase: 3, attack: 3 },
  environment: { static: 1 },
  prop: { static: 1 },
  ui: { static: 1 },
  relic: { static: 1 },
  armor: { static: 1 },
};

function wsUrl(relPath) {
  return `${PUBLIC_WORKSPACE_ROOT}/${relPath.replace(/\\/g, '/')}`;
}

function defaultRig(kind) {
  return {
    version: 1,
    kind,
    pivots: {
      root: { x: 0.5, y: 0.92 },
      torso: { x: 0.5, y: 0.55 },
      head: { x: 0.5, y: 0.22 },
      weapon: { x: 0.72, y: 0.4 },
    },
    bones: ['root', 'torso', 'head', 'weapon'],
  };
}

/**
 * Produit un pack complet stages 03→06 :
 * cleanup master, frames animation, atlas, rig, runtime manifest.
 */
export async function produceHdPack(asset, options = {}) {
  const profile = options.profile ?? 'high';
  const packRoot = join(WORKSPACE_ROOT, asset.pack_root);
  const build = builderForAsset(asset);
  const role = ['companion', 'hero', 'enemy', 'boss', 'environment'].includes(asset.role)
    ? asset.role === 'companion' || asset.role === 'hero'
      ? 'character'
      : asset.role
    : asset.role === 'ui'
      ? 'ui'
      : 'prop';
  const clips = CLIPS[role] ?? CLIPS.prop;

  for (const stage of ['03_cleanup', '04_rig', '05_animation', '06_exports', '01_source']) {
    await mkdir(join(packRoot, stage), { recursive: true });
  }

  if (asset.preview_file) {
    const srcCutout = join(WORKSPACE_ROOT, asset.preview_file);
    try {
      await copyFile(srcCutout, join(packRoot, '01_source', 'board-cutout-reference.png'));
    } catch {
      /* cutout optionnel */
    }
  }

  const frames = [];
  let frameIndex = 0;

  for (const [clipName, count] of Object.entries(clips)) {
    for (let i = 0; i < count; i++) {
      const spec = build(frameIndex + i);
      const out = join(packRoot, '05_animation', `${clipName}_${i}.png`);
      await writeAssetSpecPng(spec, out, { profile });
      frames.push({
        id: `${clipName}_${i}`,
        clip: clipName,
        path: out,
        workspacePath: `${asset.pack_root}/05_animation/${clipName}_${i}.png`.replace(/\\/g, '/'),
      });
    }
    frameIndex += count;
  }

  const masterPath = join(packRoot, '03_cleanup', 'silhouette_hd_master.png');
  await writeAssetSpecPng(build(0), masterPath, { profile: 'high' });
  await copyFile(masterPath, join(packRoot, '03_cleanup', 'silhouette-clean.png'));

  await writeJson(join(packRoot, '04_rig', 'rig.json'), defaultRig(role));

  const atlasFrames = frames.map((f) => ({ id: f.id, clip: f.clip, path: f.path, workspacePath: f.workspacePath }));
  const atlasImage = join(packRoot, '06_exports', 'runtime_atlas.png');
  const atlasJson = join(packRoot, '06_exports', 'runtime_atlas.json');
  const columns = role === 'environment' ? 1 : 4;
  const atlasManifest = await buildAtlasGrid(atlasFrames, atlasImage, atlasJson, { columns, padding: 16 });
  const atlasRel = `${asset.pack_root}/06_exports/runtime_atlas.png`.replace(/\\/g, '/');
  atlasManifest.image = atlasRel;
  await writeJson(atlasJson, atlasManifest);

  const manifest = {
    asset_id: asset.id,
    key: asset.key,
    title: asset.title,
    role: asset.role,
    pack_root: asset.pack_root,
    method: 'procedural_hd_vector_cpu',
    profile,
    palette: 'veloria_dark_fantasy_premium',
    master: `${asset.pack_root}/03_cleanup/silhouette_hd_master.png`.replace(/\\/g, '/'),
    atlas: {
      image: `${asset.pack_root}/06_exports/runtime_atlas.png`.replace(/\\/g, '/'),
      json: `${asset.pack_root}/06_exports/runtime_atlas.json`.replace(/\\/g, '/'),
      url: wsUrl(`${asset.pack_root}/06_exports/runtime_atlas.png`),
    },
    clips: Object.fromEntries(Object.entries(clips).map(([k, n]) => [k, n])),
    frame_count: frames.length,
    atlas_size: { width: atlasManifest.meta.size.w, height: atlasManifest.meta.size.h },
    generated_at: new Date().toISOString(),
  };

  await writeJson(join(packRoot, '06_exports', 'runtime-manifest.json'), manifest);

  return {
    asset,
    manifest,
    masterPath,
    atlasUrl: manifest.atlas.url,
    frameCount: frames.length,
  };
}

export async function produceAllHdPacks(assets, onProgress) {
  const results = [];
  for (const asset of assets) {
    onProgress?.(asset);
    results.push(await produceHdPack(asset));
  }
  return results;
}
