/**
 * CAPTURES DU JEU COMPOSÉ — l'œil du directeur sur le rendu final :
 *   pnpm forge:screens -- <game-id>
 * Sert le workspace, joue une séquence réelle (titre → histoire → carte →
 * niveau → combat), capture chaque temps fort + erreurs console.
 * Sorties : workspaces/<id>/06_qa/screens/*.png
 */
import { createReadStream } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import http from 'node:http';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
};
const id = process.argv.slice(2).filter((a) => a !== '--')[0];
if (!id) { console.error('Usage : pnpm forge:screens -- <game-id>'); process.exit(1); }

const root = join(process.cwd(), 'workspaces', id, '05_runtime');
const outDir = join(process.cwd(), 'workspaces', id, '06_qa', 'screens');
await mkdir(outDir, { recursive: true });

const server = http.createServer(async (req, res) => {
  const urlPath = new URL(req.url ?? '/', 'http://x').pathname;
  const file = urlPath === '/' ? join(root, 'index.html') : join(root, normalize(urlPath).replace(/^([/\\]|\.\.[/\\])+/, ''));
  try {
    await stat(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  } catch { res.writeHead(404); res.end(); }
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

const shot = async (name) => {
  await page.screenshot({ path: join(outDir, `${name}.png`) });
  console.log(`📸 ${name}`);
};
const key = async (k, times = 1, wait = 250) => {
  for (let i = 0; i < times; i++) { await page.keyboard.press(k); await page.waitForTimeout(wait); }
};

await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1800);
await shot('01-titre');

await page.click('canvas'); // focus + départ
await page.waitForTimeout(600);
await shot('02-apres-titre');

// avancer l'histoire (chaque Entrée révèle puis passe)
await key('Enter', 6, 500);
await shot('03-carte');

// lancer le niveau sélectionné
await key('Enter', 1, 400);
await page.waitForTimeout(1600);
await shot('04-niveau-debut');

// jouer : avancer + sauter + attaquer
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(1800);
await shot('05-course');
await key('Space', 1, 150);
await page.waitForTimeout(350);
await shot('06-saut');
await page.waitForTimeout(1200);
await key('KeyX', 3, 300);
await shot('07-attaque');
await page.keyboard.up('ArrowRight');
await page.waitForTimeout(600);
await shot('08-combat');

console.log(errors.length ? `\n⚠ ${errors.length} erreur(s):\n${[...new Set(errors)].slice(0, 6).join('\n')}` : '\n0 erreur console.');
await browser.close();
server.close();
