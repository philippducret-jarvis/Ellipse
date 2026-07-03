/**
 * BOARDS → MODÈLES 3D :  pnpm forge:3d -- <game-id>
 *
 * Pour chaque personnage du jeu (références générées, identité verrouillée) :
 * image → mesh GLB texturé (fal.ai trellis/hunyuan3d) → 03_assets/3d/<id>.glb
 * + manifest. Sans FAL_KEY : mode PLAN (liste exactement ce qui sera produit).
 *
 * Étape suivante (documentée dans 08_ops/gpu/README) : rig + animations via
 * Mixamo (gratuit, web) ou Tripo rigging API, puis runtime three.js.
 */
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { available, generate3d } from './lib/forge/backends/fal.mjs';

const id = process.argv.slice(2).filter((a) => a !== '--')[0];
if (!id) { console.error('Usage : pnpm forge:3d -- <game-id>'); process.exit(1); }

const ws = join(process.cwd(), 'workspaces', id);
const out = join(ws, '03_assets', '3d');
const jobs = [];
for (const dir of [join(ws, '05_runtime', 'assets', 'hero'), join(ws, '05_runtime', 'assets', 'enemies')]) {
  if (!existsSync(dir)) continue;
  for (const f of await readdir(dir)) {
    if (f.endsWith('.apose.png') || f.endsWith('.creature.png')) {
      jobs.push({ character: f.replace(/\.(apose|creature)\.png$/, ''), src: join(dir, f) });
    }
  }
}

if (!(await available())) {
  console.log(`MODE PLAN (pas de FAL_KEY) — dès la clé posée, ce lancement produira :`);
  for (const j of jobs) console.log(`  - ${j.character} : ${j.src.split('workspaces')[1]} → 03_assets/3d/${j.character}.glb (~0,10-0,30 $/mesh)`);
  console.log(`Modèle : \${FORGE_FAL_3D_MODEL:-fal-ai/trellis} · Rig+anims ensuite : Mixamo (gratuit) ou Tripo API.`);
  process.exit(0);
}

await mkdir(out, { recursive: true });
const manifest = { generatedAt: new Date().toISOString(), model: process.env.FORGE_FAL_3D_MODEL || 'fal-ai/trellis', meshes: [] };
for (const j of jobs) {
  console.log(`⚒ ${j.character} → GLB…`);
  const glb = await generate3d({ imageBuffer: await readFile(j.src) });
  const file = `${j.character}.glb`;
  await writeFile(join(out, file), glb);
  manifest.meshes.push({ character: j.character, file, bytes: glb.length });
  console.log(`  ✔ 03_assets/3d/${file} (${(glb.length / 1e6).toFixed(1)} Mo)`);
}
await writeFile(join(out, '3d-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
console.log(`✔ ${manifest.meshes.length} modèles 3D — prochaine étape : rig Mixamo puis runtime three.js.`);
