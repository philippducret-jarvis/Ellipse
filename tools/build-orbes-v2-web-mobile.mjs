#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const project = join(root, 'workspaces', 'orbes-d-astra', '04_runtime', 'godot');
const output = join(root, 'builds', 'orbes-astra-v2', 'web-mobile');
const templateDir = join(process.env.APPDATA ?? '', 'Godot', 'export_templates', '4.7.stable');
const template = join(templateDir, 'web_nothreads_release.zip');

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} exited ${code}\n${stdout}\n${stderr}`));
    });
  });
}

async function findGodot() {
  const override = process.env.ELLIPSE_GODOT_PATH;
  if (override && await exists(override)) return override;
  const packageRoot = join(process.env.LOCALAPPDATA ?? '', 'Microsoft', 'WinGet', 'Packages');
  if (await exists(packageRoot)) {
    const packages = await readdir(packageRoot, { withFileTypes: true });
    for (const entry of packages) {
      if (!entry.isDirectory() || !entry.name.startsWith('GodotEngine.GodotEngine_')) continue;
      const files = await readdir(join(packageRoot, entry.name));
      const executable = files.find((name) => /^Godot_v4\.7.*win64\.exe$/i.test(name));
      if (executable) return join(packageRoot, entry.name, executable);
    }
  }
  throw new Error('Godot 4.7 executable not found. Set ELLIPSE_GODOT_PATH.');
}

if (!process.env.APPDATA) throw new Error('APPDATA is required on Windows.');
if (!await exists(template)) throw new Error(`Missing ${template}; run node tools/install-godot-47-minimal-templates.mjs --web`);
await mkdir(output, { recursive: true });
const godot = await findGodot();
const pckPath = join(output, 'godot.pck');
const exportResult = await run(godot, ['--headless', '--path', project, '--export-pack', 'Windows Desktop', pckPath]);
await run('tar.exe', ['-xf', template, '-C', output]);

const packSize = (await stat(pckPath)).size;
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs><radialGradient id="g"><stop stop-color="#67e8f9"/><stop offset=".48" stop-color="#a78bfa"/><stop offset="1" stop-color="#050711"/></radialGradient></defs>
<rect width="512" height="512" rx="112" fill="#050711"/><circle cx="256" cy="256" r="184" fill="none" stroke="#f6c768" stroke-width="18"/>
<circle cx="256" cy="256" r="136" fill="url(#g)" stroke="#fff4dc" stroke-width="10"/><path d="M166 284c58-82 121-108 186-112-47 36-78 83-95 140-34 0-64-9-91-28Z" fill="#050711" opacity=".72"/>
<circle cx="205" cy="221" r="18" fill="#fff4dc"/><circle cx="307" cy="221" r="18" fill="#fff4dc"/>
</svg>`;
await writeFile(join(output, 'orbes-icon.svg'), icon, 'utf8');

const manifest = {
  name: "Orbes d'Astra V2 — Vertical Slice",
  short_name: 'Orbes Astra',
  description: 'Convergence jouable PC et mobile — 31 écrans reliés, 24 gardiens cohérents et quatre boucles interactives.',
  start_url: './index.html',
  scope: './',
  display: 'fullscreen',
  orientation: 'any',
  background_color: '#050711',
  theme_color: '#111529',
  icons: [{ src: 'orbes-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
};
await writeFile(join(output, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2), 'utf8');

const cacheName = 'orbes-astra-v2-convergence-v6';
const assets = [
  './', './index.html', './godot.js', './godot.wasm', './godot.pck',
  './godot.audio.worklet.js', './godot.audio.position.worklet.js',
  './manifest.webmanifest', './orbes-icon.svg',
];
const serviceWorker = `const CACHE=${JSON.stringify(cacheName)};
const ASSETS=${JSON.stringify(assets)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))));
self.addEventListener('fetch',event=>event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request))));
`;
await writeFile(join(output, 'service-worker.js'), serviceWorker, 'utf8');

const config = {
  args: [],
  canvasResizePolicy: 2,
  ensureCrossOriginIsolationHeaders: false,
  executable: 'godot',
  experimentalVK: true,
  fileSizes: { 'godot.pck': packSize },
  focusCanvas: true,
  gdextensionLibs: [],
};
let html = await readFile(join(output, 'godot.html'), 'utf8');
const replacements = new Map([
  ['$GODOT_PROJECT_NAME', "Orbes d'Astra V2 — Vertical Slice"],
  ['$GODOT_SPLASH_COLOR', '#050711'],
  ['$GODOT_HEAD_INCLUDE', '<meta name="theme-color" content="#111529"><link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="orbes-icon.svg">'],
  ['$GODOT_SPLASH_CLASSES', 'show-image--true fullsize--false use-filter--true'],
  ['$GODOT_SPLASH', 'orbes-icon.svg'],
  ['$GODOT_URL', 'godot.js'],
  ['$GODOT_CONFIG', JSON.stringify(config)],
  ['$GODOT_THREADS_ENABLED', 'false'],
]);
for (const [token, value] of replacements) html = html.replaceAll(token, value);
html = html
  .replace('<html lang="en">', '<html lang="fr">')
  .replace('</body>', `<script>if('serviceWorker' in navigator){addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(console.warn));}</script></body>`);
await writeFile(join(output, 'index.html'), html, 'utf8');

const generatedFiles = [];
for (const file of ['index.html', 'godot.js', 'godot.wasm', 'godot.pck', 'manifest.webmanifest', 'service-worker.js', 'orbes-icon.svg']) {
  const path = join(output, file);
  const bytes = await readFile(path);
  generatedFiles.push({
    file,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });
}
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  status: 'web_mobile_v6_convergence_generated_requires_browser_qa',
  sourceTemplate: template,
  godot,
  packExportWarnings: exportResult.stderr.trim().split(/\r?\n/).filter(Boolean),
  files: generatedFiles,
};
await writeFile(join(output, 'build-report.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
