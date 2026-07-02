/**
 * Preview Echoes — @ellipse/engine (Parallax2D + YSort + camera_follow).
 * Build : pnpm echoes:hd
 */
const statusNode = document.getElementById('status');
const legend = document.getElementById('legend');

function setStatus(msg) {
  if (statusNode) statusNode.textContent = msg;
}

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('fetch ' + url);
  return r.json();
}

const manifest = await fetchJson('./preview-manifest.json').catch(() => ({}));
const gdlUrl = manifest.gdl || '../../05_runtime/gdl/echoes.preview.gdl.json';
const gdl = await fetchJson(gdlUrl);

const res = gdl.meta?.resolution ?? gdl.meta?.viewport;
const width = Array.isArray(res) ? res[0] : 1280;
const height = Array.isArray(res) ? res[1] : 720;

const canvas = document.getElementById('preview');
let container = document.getElementById('engine-host');
if (!container) {
  container = document.createElement('div');
  container.id = 'engine-host';
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.minHeight = `${height}px`;
  if (canvas?.parentElement) {
    canvas.replaceWith(container);
  } else {
    document.body.appendChild(container);
  }
}

const { EllipseEngine } = await import('./engine/ellipse-engine.js');
const engine = new EllipseEngine();
await engine.init({ container, width, height });
await engine.loadGDL(gdl);

if (legend) {
  legend.innerHTML = [
    '<strong>Echoes — moteur 2.5D</strong>',
    'Parallax · Y-sort · caméra follow',
    '← → · Espace · GDL depth layers',
  ].join('<br>');
}

setStatus('Moteur @ellipse/engine — profondeur 2.5D active (Parallax2D + YSort).');

window.__ellipseEngine = engine;
