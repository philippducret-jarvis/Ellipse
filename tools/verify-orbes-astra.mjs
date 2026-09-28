#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from './lib/forge/sharp.mjs';

const root = process.cwd();
const example = join(root, 'examples', 'orbes-astra');
const exported = join(root, 'workspaces', 'orbes-d-astra', '07_exports', 'web');
const assets = [
  'astral-observatory-v3.png',
  'keepers-roster-v3.png',
  'astral-sanctuary-v3.png',
  'astral-prologue-v3.png',
  'void-leviathan-v3.png',
  'app-icon-512.png',
  'astral-super-magic-v1.png',
];

function sha(value) {
  return createHash('sha256').update(value).digest('hex');
}

const [html, game, css, manifestText, serviceWorker, gdlText, bundle, reportText] = await Promise.all([
  readFile(join(example, 'index.html'), 'utf8'),
  readFile(join(example, 'game.js'), 'utf8'),
  readFile(join(example, 'styles.css'), 'utf8'),
  readFile(join(example, 'manifest.webmanifest'), 'utf8'),
  readFile(join(example, 'service-worker.js'), 'utf8'),
  readFile(join(example, 'game.gdl.json'), 'utf8'),
  readFile(join(example, 'engine', 'ellipse-engine.js')),
  readFile(join(root, 'workspaces', 'orbes-d-astra', '08_ops', 'manifests', 'vertical-slice-report.json'), 'utf8'),
]);
const gdl = JSON.parse(gdlText);
const report = JSON.parse(reportText);
const manifest = JSON.parse(manifestText);
const config = gdl.meta?.merge_drop;

assert.match(html, /id="game-stage"/);
assert.match(html, /rel="manifest"/);
assert.match(html, /serviceWorker\.register/);
assert.equal(manifest.display, 'standalone');
assert.ok(manifest.icons.length > 0);
assert.match(serviceWorker, /ellipse-engine\.js/);
assert.match(html, /stage-panel--controls/);
assert.match(html, /stage-restart/);
assert.match(game, /const CHAPTERS =/);
assert.match(game, /const CHALLENGES =/);
assert.match(game, /RUN_RESULT_EVENT/);
assert.match(bundle.toString('utf8'), /export\s*\{[\s\S]*RUN_RESULT_EVENT[\s\S]*\};?\s*$/, 'Le bundle navigateur doit exporter RUN_RESULT_EVENT');
assert.match(game, /startMemory/);
assert.match(game, /startAlignment/);
assert.match(game, /ABILITY_CAST_EVENT/);
assert.match(game, /finishRuneRush/);
assert.match(game, /featured_hero_id/);
assert.match(css, /super-overlay-life/);
assert.match(css, /responsive_desktop_mobile_stage|Scène de jeu PC|#game-stage/);

assert.equal(gdl.meta.version, '1.0.0');
assert.equal(config.heroes.length, 24);
assert.equal(new Set(config.heroes.map((hero) => hero.id)).size, 24);
assert.equal(new Set(config.heroes.map((hero) => hero.portrait_frame)).size, 24);
assert.ok(config.heroes.every((hero) => hero.faction && hero.role && hero.element && hero.quote && hero.biography));
assert.ok(config.heroes.every((hero) => hero.portrait_columns === 6 && hero.portrait_rows === 4));
assert.ok(config.heroes.every((hero) => Array.isArray(hero.skills) && hero.skills.length === 2));
assert.equal(config.pity_after, 30);
assert.deepEqual(config.initial_unlocked_heroes, ['mira', 'brann', 'lys']);
assert.ok(bundle.length > 1_000_000);
assert.equal(report.content.guardians, 24);
assert.equal(report.content.campaign_missions, 18);
assert.equal(report.content.campaign_bosses, 3);
assert.equal(report.content.minigames, 2);

for (const asset of assets) {
  const file = join(example, 'assets', asset);
  await access(file);
  const metadata = await sharp(file).metadata();
  const minimum = asset === 'app-icon-512.png' ? 512 : 900;
  assert.ok((metadata.width ?? 0) >= minimum, `${asset}: largeur HD insuffisante`);
  assert.ok((metadata.height ?? 0) >= minimum, `${asset}: hauteur HD insuffisante`);
}

for (let frame = 0; frame < 24; frame += 1) {
  const name = `guardian-${String(frame).padStart(2, '0')}.png`;
  const source = join(example, 'assets', 'guardians', name);
  const output = join(exported, 'assets', 'guardians', name);
  await Promise.all([access(source), access(output)]);
  const metadata = await sharp(source).metadata();
  assert.ok((metadata.width ?? 0) >= 300, `${name}: portrait trop étroit`);
  assert.ok((metadata.height ?? 0) >= 500, `${name}: portrait trop bas`);
}

for (const file of ['index.html', 'game.js', 'styles.css', 'game.gdl.json', 'manifest.webmanifest', 'service-worker.js']) {
  const [source, output] = await Promise.all([readFile(join(example, file)), readFile(join(exported, file))]);
  assert.equal(sha(source), sha(output), `${file}: export désynchronisé`);
}

console.log(JSON.stringify({
  ok: true,
  title: gdl.meta.title,
  version: gdl.meta.version,
  guardians: config.heroes.length,
  missions: 18,
  bosses: 3,
  challenges: 3,
  minigames: 2,
  engine_bundle_bytes: bundle.length,
  assets,
}, null, 2));
