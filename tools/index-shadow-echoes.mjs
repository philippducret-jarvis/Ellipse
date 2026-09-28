/** Indexe les références importées sans lancer de génération de jeu. */
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const ws = join(root, 'workspaces', 'shadow-echoes');
const projectId = 'fc4a8b3e-3f76-4f13-bc30-685d12c3ca21';
const timestamp = new Date().toISOString();
const digest = (data) => createHash('sha256').update(data).digest('hex');
function stableId(key) {
  const h = digest(key);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
function classify(name) {
  const key = name.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  if (/atlas|equipement|inventaire/.test(key)) return ['prop', 'prop', 'Équipements et objets'];
  if (/combat|bataille|survie|caravane/.test(key)) return ['ui', 'ui', 'Combats et activités'];
  if (/course|peche|puzzle|memoire|jeu_de_des/.test(key)) return ['ui', 'ui', 'Mini-jeux'];
  if (/interface|accueil|arbre|talents|formation|composition|invocation|hubs|missions|ecrans|collage/.test(key)) return ['ui', 'ui', 'Interfaces et systèmes'];
  if (/carte_du_monde|citadelle|cite_gothique|ruines_de|expedition|sanctuaire/.test(key)) return ['environment', 'environment', 'Monde et décors'];
  return ['character', 'hero', 'Héros et planches à qualifier'];
}
const entries = [];
for (let part = 1; part <= 3; part++) {
  const folder = `01_inputs/references/partie-${part}`;
  for (const file of (await readdir(join(ws, folder))).sort()) {
    const buffer = await readFile(join(ws, folder, file));
    const isPng = file.toLowerCase().endsWith('.png');
    if (isPng && (buffer.length < 24 || buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a')) {
      throw new Error(`PNG invalide : ${file}`);
    }
    entries.push({
      path: `${folder}/${file}`, filename: file, part,
      archive: `shadow_echoes_elements_chat_partie_${part}_sur_3.zip`,
      bytes: buffer.length, sha256: digest(buffer),
      ...(isPng ? { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), category: classify(file)[2] } : {}),
    });
  }
}
const images = entries.filter((e) => e.width);
if (entries.length !== 156 || images.length !== 155) throw new Error('Import incomplet : 155 PNG et 1 TXT attendus.');
const assets = images.map((e) => {
  const [kind, role] = classify(e.filename);
  const url = `/workspaces/shadow-echoes/${e.path.split('/').map(encodeURIComponent).join('/')}`;
  return {
    id: stableId(e.path), project_id: projectId, kind, role,
    title: e.filename.replace(/\.png$/i, '').replaceAll('_', ' '),
    status: 'concept', source_prompt: null, created_at: timestamp,
    spec: { url, source: e.archive, reference_only: true, production_ready: false,
      category: e.category, classification_method: 'filename_heuristic_pending_visual_review',
      width: e.width, height: e.height, sha256: e.sha256 },
  };
});
const sources = assets.map((asset, index) => ({
  id: stableId(`source:${images[index].path}`), asset_id: asset.id,
  source_type: 'concept_reference', url: asset.spec.url, file_path: images[index].path,
  metadata: { original_archive: images[index].archive, original_filename: images[index].filename,
    reference_only: true, sha256: images[index].sha256 }, created_at: timestamp,
}));
// Une réindexation des références ne doit pas effacer les héros déjà en production.
let producedAssets = [];
let producedSources = [];
try {
  const previous = JSON.parse(await readFile(join(ws, '03_assets', 'registry', 'studio-asset-catalog.json'), 'utf8'));
  producedAssets = (previous.assets ?? []).filter((asset) => asset.spec?.production_lot);
  const producedIds = new Set(producedAssets.map((asset) => asset.id));
  producedSources = (previous.asset_sources ?? []).filter((source) => producedIds.has(source.asset_id));
} catch (error) { if (error.code !== 'ENOENT') throw error; }
await mkdir(join(ws, '03_assets', 'registry'), { recursive: true });
await writeFile(join(ws, '01_inputs', 'reference-index.json'), JSON.stringify({
  schema_version: 1, imported_at: timestamp, files: entries.length, images: images.length,
  unique_image_hashes: new Set(images.map((e) => e.sha256)).size,
  classification: 'Indicative par nom de fichier ; revue visuelle détaillée à faire.', entries,
}, null, 2) + '\n');
await writeFile(join(ws, '03_assets', 'registry', 'studio-asset-catalog.json'),
  JSON.stringify({ assets: [...assets, ...producedAssets], asset_sources: [...sources, ...producedSources] }, null, 2) + '\n');
// Ne jamais remettre un projet existant au stade planning lors d’une réindexation.
try {
  await writeFile(join(ws, 'workspace.json'), JSON.stringify({
    project_id: projectId, slug: 'shadow-echoes', title: 'Shadow Echoes', status: 'planning',
    dimension: '2.5d', genre: 'RPG action / collection de héros', runtime: 'ellipse_web_2d',
    camera_mode: 'isometric', camera_description: 'Vue orthographique surélevée en trois quarts, avec profondeur jouable', created_at: timestamp, updated_at: timestamp,
    scope_status: 'proposal_pending_design_decisions', playable: false,
  }, null, 2) + '\n', { flag: 'wx' });
} catch (error) { if (error.code !== 'EEXIST') throw error; }
console.log(JSON.stringify({ workspace: ws, images: images.length, files: entries.length, production_assets_preserved: producedAssets.length }));
