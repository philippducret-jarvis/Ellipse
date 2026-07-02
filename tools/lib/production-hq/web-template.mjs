export function buildProductionWebFiles() {
  const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Echoes Production HQ</title>
    <link rel="stylesheet" href="./production-hq.css" />
  </head>
  <body>
    <div class="hq-shell">
      <header class="hq-hero">
        <div>
          <p class="eyebrow">Ellipse production HQ</p>
          <h1>Taxonomy assets, routing modeles et work orders agents</h1>
          <p class="lede">Vue de production pour separer les familles d assets, savoir quels modeles utiliser et lancer les bonnes chaines de decoupe, rig, animation et export.</p>
        </div>
        <div class="hero-links">
          <a href="/workspaces/echoes-of-the-mushroom-realm/07_exports/web/preview.html" target="_blank" rel="noreferrer">Preview</a>
          <a href="/workspaces/echoes-of-the-mushroom-realm/07_exports/web/construction-map.html" target="_blank" rel="noreferrer">Construction</a>
          <a href="/workspaces/echoes-of-the-mushroom-realm/07_exports/web/systems-board.html" target="_blank" rel="noreferrer">Systems</a>
        </div>
      </header>
      <nav class="hq-tabs">
        <button data-view="families" class="active">Families</button>
        <button data-view="routing">Routing</button>
        <button data-view="workorders">Work Orders</button>
      </nav>
      <main class="hq-grid">
        <section class="hq-stage-panel">
          <div class="panel-head">
            <div>
              <h2 id="hq-title">Families</h2>
              <p id="hq-description">Chargement...</p>
            </div>
          </div>
          <div id="hq-stage" class="hq-stage"></div>
        </section>
        <aside class="hq-detail-panel">
          <div class="panel-head">
            <div>
              <h2>Details</h2>
              <p>Selectionne une famille, un routing ou un work order.</p>
            </div>
          </div>
          <div id="hq-detail" class="hq-detail-card">
            <h3>Selection vide</h3>
            <p>Choisis une vue de production.</p>
          </div>
        </aside>
      </main>
    </div>
    <script type="module" src="./production-hq.js"></script>
  </body>
</html>
`;

  const css = `:root {
  --bg: #07060a;
  --panel: rgba(16, 11, 18, 0.94);
  --panel-2: rgba(23, 17, 29, 0.92);
  --line: rgba(240, 225, 186, 0.14);
  --text: #f0e1ba;
  --muted: #baa78a;
  --accent: #d35343;
  --teal: #70d5ef;
  --violet: #aa84ff;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  color: var(--text);
  font-family: Georgia, "Times New Roman", serif;
  background:
    radial-gradient(circle at top left, rgba(112, 213, 239, 0.07), transparent 22%),
    radial-gradient(circle at top right, rgba(211, 83, 67, 0.15), transparent 24%),
    linear-gradient(180deg, #050409 0%, #110c16 52%, #09070b 100%);
}
.hq-shell { max-width: 1600px; margin: 0 auto; padding: 24px; }
.hq-hero, .hq-stage-panel, .hq-detail-panel {
  border: 1px solid var(--line);
  background: var(--panel);
  box-shadow: 0 18px 54px rgba(0,0,0,0.28);
}
.hq-hero {
  display: flex; justify-content: space-between; gap: 24px; padding: 28px; border-radius: 24px; margin-bottom: 18px;
}
.eyebrow { margin: 0 0 10px; text-transform: uppercase; letter-spacing: 0.24em; font-size: 0.72rem; color: var(--teal); }
.lede { margin: 12px 0 0; max-width: 880px; color: var(--muted); line-height: 1.65; }
.hero-links { display: flex; gap: 12px; flex-wrap: wrap; }
.hero-links a, .hq-tabs button, .detail-file, .detail-tag {
  border: 1px solid rgba(240,225,186,0.15);
  border-radius: 999px;
  padding: 10px 14px;
  color: var(--text);
  background: rgba(255,255,255,0.03);
  text-decoration: none;
}
.hq-tabs { display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
.hq-tabs button { cursor: pointer; }
.hq-tabs button.active { background: linear-gradient(135deg, rgba(170,132,255,0.24), rgba(112,213,239,0.16)); }
.hq-grid { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 18px; }
.hq-stage-panel, .hq-detail-panel { border-radius: 22px; padding: 20px; }
.panel-head { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 16px; }
.panel-head p { margin: 6px 0 0; color: var(--muted); }
.hq-stage { min-height: 720px; }
.family-grid, .routing-grid, .workorder-grid { display: grid; gap: 14px; }
.family-grid { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
.routing-grid { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
.workorder-grid { grid-template-columns: 1fr; }
.family-card, .routing-card, .workorder-card, .hq-detail-card {
  border-radius: 18px; border: 1px solid var(--line); background: var(--panel-2); padding: 16px;
}
.family-card h3, .routing-card h3, .workorder-card h3, .hq-detail-card h3 { margin: 0 0 8px; }
.family-card p, .routing-card p, .workorder-card p, .hq-detail-card p, .family-card li, .routing-card li, .workorder-card li, .hq-detail-card li { color: var(--muted); }
.chip-row, .detail-files, .detail-tags { display: flex; gap: 8px; flex-wrap: wrap; }
.status-pill { border-radius: 999px; padding: 4px 10px; border: 1px solid rgba(240,225,186,0.12); }
.status-pill.ready { color: #7ce2a0; }
.status-pill.in_progress { color: #f5d27c; }
.status-pill.queued { color: var(--muted); }
.stage-list { display: grid; gap: 8px; margin-top: 12px; }
.stage-item { display: flex; justify-content: space-between; gap: 10px; padding: 10px 12px; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(240,225,186,0.08); }
@media (max-width: 1200px) { .hq-grid { grid-template-columns: 1fr; } }
@media (max-width: 700px) { .hq-shell { padding: 14px; } .hq-hero { padding: 18px; } }
`;

  const js = `const manifestUrl = './production-hq.manifest.json';
const tabs = [...document.querySelectorAll('.hq-tabs button')];
const stage = document.getElementById('hq-stage');
const detail = document.getElementById('hq-detail');
const titleNode = document.getElementById('hq-title');
const descriptionNode = document.getElementById('hq-description');
let manifest = null;
let taxonomy = null;
let routing = null;
let production = null;

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function setDetail(payload) {
  const tags = (payload.tags ?? []).map((tag) => '<span class="detail-tag">' + escapeHtml(tag) + '</span>').join('');
  const files = (payload.files ?? []).map((file) => '<a class="detail-file" href="/workspaces/echoes-of-the-mushroom-realm/' + file + '" target="_blank" rel="noreferrer">' + escapeHtml(file) + '</a>').join('');
  const list = (payload.list ?? []).map((entry) => '<li>' + escapeHtml(entry) + '</li>').join('');
  detail.innerHTML =
    '<h3>' + escapeHtml(payload.title ?? 'Details') + '</h3>' +
    (payload.meta ? '<p>' + escapeHtml(payload.meta) + '</p>' : '') +
    (payload.description ? '<p>' + escapeHtml(payload.description) + '</p>' : '') +
    (tags ? '<div class="detail-tags">' + tags + '</div>' : '') +
    (list ? '<ul>' + list + '</ul>' : '') +
    (files ? '<div class="detail-files">' + files + '</div>' : '');
}

function renderFamilies() {
  titleNode.textContent = 'Asset families';
  descriptionNode.textContent = 'Separate every family before generation so hero, boss, map, props, UI and audio never collapse into one bucket.';
  const wrap = document.createElement('div');
  wrap.className = 'family-grid';
  for (const family of taxonomy.families) {
    const card = document.createElement('article');
    card.className = 'family-card';
    card.innerHTML = '<h3>' + escapeHtml(family.label) + '</h3><p>' + escapeHtml(family.group) + ' | ' + family.folderPattern + '</p><p>' + escapeHtml(family.runtimeUse.join(', ')) + '</p>';
    card.onclick = () => setDetail({
      title: family.label,
      meta: family.group,
      description: 'Roles: ' + family.roles.join(', '),
      tags: family.kinds,
      list: family.runtimeUse,
      files: ['03_assets/registry/asset-taxonomy.json'],
    });
    wrap.appendChild(card);
  }
  return wrap;
}

function renderRouting() {
  titleNode.textContent = 'Model routing';
  descriptionNode.textContent = 'Which models and tools should be used for each asset family and output profile.';
  const wrap = document.createElement('div');
  wrap.className = 'routing-grid';
  for (const route of routing.routes) {
    const card = document.createElement('article');
    card.className = 'routing-card';
    card.innerHTML = '<h3>' + escapeHtml(route.title) + '</h3><p>' + escapeHtml(route.role + ' | ' + route.kind) + '</p><p>' + escapeHtml(route.routing.pipeline) + '</p>';
    card.onclick = () => setDetail({
      title: route.title,
      meta: route.routing.pipeline,
      description: 'Execution: ' + route.routing.execution.join(', '),
      tags: route.routing.execution,
      list: [...route.routing.models.map((model) => model.id + ' - ' + model.use), ...route.routing.outputs],
      files: ['03_assets/registry/model-routing.json'],
    });
    wrap.appendChild(card);
  }
  return wrap;
}

function renderWorkOrders() {
  titleNode.textContent = 'Agent work orders';
  descriptionNode.textContent = 'Concrete queues for cutout, cleanup, rig, motion and export by asset pack.';
  const wrap = document.createElement('div');
  wrap.className = 'workorder-grid';
  for (const order of production.work_orders) {
    const stageItems = order.stages
      .map((stageEntry) => '<div class="stage-item"><strong>' + escapeHtml(stageEntry.title) + '</strong><span class="status-pill ' + escapeHtml(stageEntry.status) + '">' + escapeHtml(stageEntry.status) + '</span></div>')
      .join('');
    const card = document.createElement('article');
    card.className = 'workorder-card';
    card.innerHTML =
      '<h3>' + escapeHtml(order.asset_title) + '</h3>' +
      '<p>' + escapeHtml(order.role + ' | ' + order.kind + ' | ' + order.queue_state) + '</p>' +
      '<div class="chip-row">' + order.execution_profile.map((entry) => '<span class="detail-tag">' + escapeHtml(entry) + '</span>').join('') + '</div>' +
      '<div class="stage-list">' + stageItems + '</div>';
    card.onclick = () => setDetail({
      title: order.asset_title,
      meta: order.role + ' | ' + order.kind,
      description: 'Queue state: ' + order.queue_state,
      tags: order.execution_profile,
      list: ['agents: ' + order.assigned_agents.join(', '), ...order.expected_outputs],
      files: ['08_ops/manifests/agent-work-orders.json', '08_ops/manifests/production-hq.json'],
    });
    wrap.appendChild(card);
  }
  return wrap;
}

function activateTab(viewId) {
  for (const tab of tabs) tab.classList.toggle('active', tab.dataset.view === viewId);
  stage.innerHTML = '';
  if (viewId === 'families') stage.appendChild(renderFamilies());
  if (viewId === 'routing') stage.appendChild(renderRouting());
  if (viewId === 'workorders') stage.appendChild(renderWorkOrders());
}

for (const tab of tabs) tab.onclick = () => activateTab(tab.dataset.view);

manifest = await fetch(manifestUrl).then((res) => res.json());
taxonomy = await fetch(manifest.taxonomy_url).then((res) => res.json());
routing = await fetch(manifest.routing_url).then((res) => res.json());
production = await fetch(manifest.production_url).then((res) => res.json());
setDetail({
  title: 'Production HQ ready',
  meta: 'asset factory control plane',
  description: 'Use this surface to separate families, choose model routing and track agent work orders.',
  list: ['families', 'routing', 'work orders'],
  files: ['03_assets/registry/asset-taxonomy.json', '03_assets/registry/model-routing.json', '08_ops/manifests/agent-work-orders.json'],
});
activateTab('families');
`;

  return { html, css, js };
}
