import { join } from 'node:path';
import { BOSS_PACK_ROOT, ENEMY_PACK_ROOT, WORKSPACE_ROOT } from './constants.mjs';
import { writeJson } from './io.mjs';
import { buildAtlasGrid, copyImageToWorkspace, cropAlphaImage, pathExists, removeChromaKeyImage } from './production-image-utils.mjs';
import { rootGuardianProductionSpec, sporelingProductionSpec } from './production-sheet-specs.mjs';

function workspacePath(packRoot, relativePath) {
  return join(packRoot, relativePath);
}

function relativeWorkspaceFile(absolutePath) {
  return absolutePath.replace(`${WORKSPACE_ROOT}\\`, '').replace(/\\/g, '/');
}

function clipSequencesFromFrames(frames) {
  return Object.fromEntries(
    frames
      .filter((frame) => frame.clip)
      .map((frame) => [frame.clip, [frame.id]]),
  );
}

async function prepareSourceFiles(packRoot, spec) {
  const workspaceSource = workspacePath(packRoot, spec.workspaceSource);
  const workspaceEditorial = workspacePath(packRoot, spec.workspaceEditorialReference);

  if (await pathExists(spec.externalSource)) {
    await copyImageToWorkspace(spec.externalSource, workspaceSource);
  }
  if (await pathExists(spec.editorialReference)) {
    await copyImageToWorkspace(spec.editorialReference, workspaceEditorial);
  }

  if (!(await pathExists(workspaceSource))) {
    return null;
  }

  const alphaSheet = workspacePath(packRoot, spec.alphaSheet);
  await removeChromaKeyImage(workspaceSource, alphaSheet);

  return {
    workspaceSource,
    workspaceEditorial: (await pathExists(workspaceEditorial)) ? workspaceEditorial : null,
    alphaSheet,
  };
}

async function buildDerivedFrames(packRoot, spec, alphaSheet) {
  const builtFrames = [];
  for (const frameSpec of spec.poseCuts) {
    const outPath = workspacePath(packRoot, frameSpec.output);
    const result = await cropAlphaImage(alphaSheet, outPath, frameSpec.box, { trim: false, padding: 16 });
    builtFrames.push({
      id: frameSpec.id,
      clip: frameSpec.clip ?? null,
      role: frameSpec.role ?? 'pose',
      includeInAtlas: frameSpec.includeInAtlas,
      absolutePath: outPath,
      workspacePath: relativeWorkspaceFile(outPath),
      width: result.width,
      height: result.height,
    });
  }
  return builtFrames;
}

async function buildSporelingProductionSheet() {
  const prepared = await prepareSourceFiles(ENEMY_PACK_ROOT, sporelingProductionSpec);
  if (!prepared) return null;

  const frames = await buildDerivedFrames(ENEMY_PACK_ROOT, sporelingProductionSpec, prepared.alphaSheet);
  const atlasFrames = frames.filter((frame) => frame.includeInAtlas).map((frame) => ({
    id: frame.id,
    clip: frame.clip,
    role: frame.role,
    path: frame.absolutePath,
    workspacePath: frame.workspacePath,
  }));

  const atlas = await buildAtlasGrid(
    atlasFrames,
    workspacePath(ENEMY_PACK_ROOT, sporelingProductionSpec.atlasImage),
    workspacePath(ENEMY_PACK_ROOT, sporelingProductionSpec.atlasJson),
    { columns: 3, padding: 20 },
  );

  const clipManifest = clipSequencesFromFrames(frames);
  await writeJson(workspacePath(ENEMY_PACK_ROOT, sporelingProductionSpec.clipManifest), clipManifest);

  const runtimeManifest = {
    source: 'ellipse-level01-sporeling-hd-sheet-v1',
    production_tier: 'transparent_hd_sheet',
    source_sheet: relativeWorkspaceFile(prepared.workspaceSource),
    editorial_reference: prepared.workspaceEditorial ? relativeWorkspaceFile(prepared.workspaceEditorial) : null,
    alpha_sheet: relativeWorkspaceFile(prepared.alphaSheet),
    preview: relativeWorkspaceFile(workspacePath(ENEMY_PACK_ROOT, sporelingProductionSpec.preview)),
    atlas: relativeWorkspaceFile(workspacePath(ENEMY_PACK_ROOT, sporelingProductionSpec.atlasImage)),
    atlas_manifest: relativeWorkspaceFile(workspacePath(ENEMY_PACK_ROOT, sporelingProductionSpec.atlasJson)),
    pose_frames: frames.map((frame) => ({
      id: frame.id,
      clip: frame.clip,
      role: frame.role,
      file: frame.workspacePath,
      width: frame.width,
      height: frame.height,
    })),
    clips: clipManifest,
  };
  await writeJson(workspacePath(ENEMY_PACK_ROOT, sporelingProductionSpec.runtimeManifest), runtimeManifest);

  return {
    ...runtimeManifest,
    atlas_meta: atlas.meta,
  };
}

async function buildRootGuardianProductionSheet() {
  const prepared = await prepareSourceFiles(BOSS_PACK_ROOT, rootGuardianProductionSpec);
  if (!prepared) return null;

  const frames = await buildDerivedFrames(BOSS_PACK_ROOT, rootGuardianProductionSpec, prepared.alphaSheet);
  const atlasFrames = frames.filter((frame) => frame.includeInAtlas).map((frame) => ({
    id: frame.id,
    clip: frame.clip,
    role: frame.role,
    path: frame.absolutePath,
    workspacePath: frame.workspacePath,
  }));

  const atlas = await buildAtlasGrid(
    atlasFrames,
    workspacePath(BOSS_PACK_ROOT, rootGuardianProductionSpec.atlasImage),
    workspacePath(BOSS_PACK_ROOT, rootGuardianProductionSpec.atlasJson),
    { columns: 2, padding: 24 },
  );

  const clipManifest = clipSequencesFromFrames(frames);
  await writeJson(workspacePath(BOSS_PACK_ROOT, rootGuardianProductionSpec.clipManifest), clipManifest);

  const runtimeManifest = {
    source: 'ellipse-level01-root-guardian-hd-sheet-v1',
    production_tier: 'transparent_hd_sheet',
    source_sheet: relativeWorkspaceFile(prepared.workspaceSource),
    editorial_reference: prepared.workspaceEditorial ? relativeWorkspaceFile(prepared.workspaceEditorial) : null,
    alpha_sheet: relativeWorkspaceFile(prepared.alphaSheet),
    preview: relativeWorkspaceFile(workspacePath(BOSS_PACK_ROOT, rootGuardianProductionSpec.preview)),
    atlas: relativeWorkspaceFile(workspacePath(BOSS_PACK_ROOT, rootGuardianProductionSpec.atlasImage)),
    atlas_manifest: relativeWorkspaceFile(workspacePath(BOSS_PACK_ROOT, rootGuardianProductionSpec.atlasJson)),
    phase_frames: frames.map((frame) => ({
      id: frame.id,
      clip: frame.clip,
      role: frame.role,
      file: frame.workspacePath,
      width: frame.width,
      height: frame.height,
    })),
    clips: clipManifest,
  };
  await writeJson(workspacePath(BOSS_PACK_ROOT, rootGuardianProductionSpec.runtimeManifest), runtimeManifest);

  return {
    ...runtimeManifest,
    atlas_meta: atlas.meta,
  };
}

export async function buildProductionSheets() {
  const [sporelingHd, rootGuardianHd] = await Promise.all([
    buildSporelingProductionSheet(),
    buildRootGuardianProductionSheet(),
  ]);

  return {
    sporelingHd,
    rootGuardianHd,
  };
}
