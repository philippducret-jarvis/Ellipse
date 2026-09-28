import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from './lib/forge/sharp.mjs';
import { HEROES, LOT } from './lib/shadow-echoes/heroes.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const ws = join(root, 'workspaces', 'shadow-echoes');
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const save = async (path, value) => {await mkdir(dirname(path), {recursive: true}); await writeFile(path, JSON.stringify(value, null, 2) + '\n');};
const hash = (buffer) => createHash('sha256').update(buffer).digest('hex');
const idFor = (key) => {const h = hash(key); return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
const manifest = await readJson(join(ws, 'workspace.json'));
const catalog = await readJson(join(ws, '03_assets', 'registry', 'studio-asset-catalog.json'));
const indexed = await readJson(join(ws, '01_inputs', 'reference-index.json'));
const now = new Date().toISOString();
const heroes = [];
for (const hero of HEROES) {
  const assetRoot = `03_assets/characters/${hero.id}`;
  const file = `${assetRoot}/presentation-v1.png`;
  const bytes = await readFile(join(ws, file));
  const meta = await sharp(bytes).metadata();
  const {data, info} = await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject: true});
  let transparent = 0; let solid = 0;
  for(let i = 3; i < data.length; i += 4) { if(data[i] === 0) transparent++; if(data[i] >= 240) solid++; }
  const pixelCount = info.width * info.height;
  const referencePath = `01_inputs/references/${hero.reference}`;
  const reference = indexed.entries.find((e) => e.path === referencePath);
  if (!reference || hash(await readFile(join(ws, referencePath))) !== reference.sha256) throw new Error(`Référence absente ou modifiée : ${hero.id}`);
  const technicalPassed = meta.width >= 1024 && meta.height >= 1536 && meta.hasAlpha && transparent / pixelCount > .1 && solid / pixelCount > .2;
  if (!technicalPassed) throw new Error(`Base HD invalide : ${hero.id}`);
  const qa = {
    hero_id: hero.id, checked_at: now, technical_passed: technicalPassed,
    width: meta.width, height: meta.height, sha256: hash(bytes),
    alpha: {present: meta.hasAlpha, fully_transparent_fraction: transparent / pixelCount, solid_fraction: solid / pixelCount},
    visual_status: 'review', fidelity_approved: false, runtime_ready: false,
    observations: hero.invariants,
    remaining: ['Comparer les détails du visage et des ornements à la référence', 'Nettoyer les éventuels halos et pixels de fond', 'Séparer les éléments pour le rig', 'Produire et vérifier les animations en mouvement'],
  };
  await save(join(ws, assetRoot, 'qa-v1.json'), qa);
  const priorDefinition = await readJson(join(ws, assetRoot, 'hero.json')).catch(error => {if(error.code !== 'ENOENT') throw error; return {};});
  const definition = {...hero, ...(priorDefinition.motion_study ? {motion_study: priorDefinition.motion_study} : {}), ...(priorDefinition.layer_study ? {layer_study: priorDefinition.layer_study} : {}), presentation: file, source_reference: referencePath,
    rarity_evidence: {method: 'visual_reading', text: 'Mythique', source: referencePath},
    quality_target: LOT.qualityTarget, production_stage: 'hd_base_review',
    skill_status: 'prototype_proposal', rig: null, animations: [], qa: `${assetRoot}/qa-v1.json`};
  await save(join(ws, assetRoot, 'hero.json'), definition);
  heroes.push(definition);
  const assetId = idFor(`shadow-echoes:mythiques:${hero.id}`);
  const sourceId = idFor(`shadow-echoes:mythiques:${hero.id}:v1`);
  const url = `/workspaces/shadow-echoes/${file}`;
  catalog.assets = catalog.assets.filter((a) => a.id !== assetId);
  catalog.asset_sources = catalog.asset_sources.filter((s) => s.id !== sourceId);
  catalog.assets.push({id: assetId, project_id: manifest.project_id, kind: 'character', role: 'hero',
    title: `${hero.name} — Mythique — base HD v1`, status: 'review', source_prompt: null,
    spec: {url, hero_id: hero.id, rarity: 'mythique', production_lot: LOT.id, reference_only: false,
      production_ready: false, stage: 'hd_base_review', ...(priorDefinition.motion_study ? {motion_study: priorDefinition.motion_study} : {}), ...(priorDefinition.layer_study ? {layer_study: priorDefinition.layer_study} : {}), width: meta.width, height: meta.height, sha256: hash(bytes)}, created_at: now});
  catalog.asset_sources.push({id: sourceId, asset_id: assetId, source_type: 'generated_seed', url, file_path: file,
    metadata: {reference: referencePath, reference_sha256: reference.sha256, tool: 'image_gen', review_required: true}, created_at: now});
}
await save(join(ws, '03_assets/registry/studio-asset-catalog.json'), catalog);
await save(join(ws, '02_production/lot-01/manifest.json'), {...LOT, updated_at: now, status: 'in_progress',
  review_url: '/workspaces/shadow-echoes/07_exports/web/heroes.html',
  delivered: ['4 bases HD RGBA 1024×1536', '4 définitions de héros', '12 compétences de laboratoire', 'Comparateur de références'],
  missing: ['Fidélité finale approuvée', 'Rigs', 'Animations de combat', 'Personnages intégrés dans une mission'], heroes});
await save(join(ws, 'workspace.json'), {...manifest, status: 'producing', updated_at: now,
  scope_status: 'mythic_heroes_only', active_lot: manifest.active_lot ?? LOT.id, quality_target: LOT.qualityTarget, playable: manifest.playable ?? false,
  hero_lab_url: '/workspaces/shadow-echoes/07_exports/web/heroes.html'});
const out = join(ws, '07_exports/web');
await mkdir(out, {recursive: true});
for (const file of ['heroes.html','heroes.css','heroes.mjs','hero-lab.mjs','app.mjs']) {
  await copyFile(join(root, 'tools/lib/shadow-echoes', file), join(out, file));
}
console.log(JSON.stringify({heroes: heroes.length, skills: heroes.reduce((n,h)=>n+h.skills.length,0), technical_checks: 'passed', artistic_review: 'pending', atelier: join(out,'heroes.html')},null,2));
