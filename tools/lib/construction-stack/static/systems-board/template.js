const manifestUrl = './systems-board.manifest.json';
const tabs = [...document.querySelectorAll('.systems-tabs button')];
const toolbar = document.getElementById('systems-toolbar');
const stage = document.getElementById('systems-stage');
const detail = document.getElementById('systems-detail');
const viewTitle = document.getElementById('view-title');
const viewDescription = document.getElementById('view-description');

let board = null;
let activeView = 'board';
let activeCategory = 'all';
let selectedTokenId = null;
let placements = [];

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function setDetail(payload) {
  const files = (payload.files ?? [])
    .map((file) => '<a class="detail-file" href="/workspaces/echoes-of-the-mushroom-realm/' + file + '" target="_blank" rel="noreferrer">' + escapeHtml(file) + '</a>')
    .join('');
  const tags = (payload.tags ?? [])
    .map((tag) => '<span class="detail-tag">' + escapeHtml(tag) + '</span>')
    .join('');
  const list = (payload.list ?? [])
    .map((item) => '<li>' + escapeHtml(item) + '</li>')
    .join('');

  detail.innerHTML =
    '<h3>' + escapeHtml(payload.title ?? 'Details') + '</h3>' +
    (payload.meta ? '<p class="meta-line">' + escapeHtml(payload.meta) + '</p>' : '') +
    (payload.description ? '<p>' + escapeHtml(payload.description) + '</p>' : '') +
    (tags ? '<div class="detail-tags">' + tags + '</div>' : '') +
    (list ? '<ul class="detail-list">' + list + '</ul>' : '') +
    (files ? '<div class="detail-files">' + files + '</div>' : '');
}

function flattenItems() {
  return board.palette.categories.flatMap((category) =>
    category.items.map((item) => ({ ...item, category_id: category.id, category_label: category.label })),
  );
}

function findItem(itemId) {
  return flattenItems().find((item) => item.id === itemId) ?? null;
}

function savePlacements() {
  localStorage.setItem('echoes_systems_board_layout', JSON.stringify(placements));
}

function loadPlacements() {
  try {
    const raw = localStorage.getItem('echoes_systems_board_layout');
    if (!raw) return board.interactions.starter_layout.map((entry, index) => ({ ...entry, uid: 'seed-' + index }));
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('invalid placements');
    return parsed;
  } catch {
    return board.interactions.starter_layout.map((entry, index) => ({ ...entry, uid: 'seed-' + index }));
  }
}

function renderToolbar() {
  toolbar.innerHTML = '';

  if (activeView === 'board') {
    const all = document.createElement('button');
    all.className = 'chip-filter';
    all.textContent = activeCategory === 'all' ? 'Palette: all' : 'Show all palette items';
    all.onclick = () => {
      activeCategory = 'all';
      renderView();
    };
    toolbar.appendChild(all);

    for (const category of board.palette.categories) {
      const chip = document.createElement('button');
      chip.className = 'chip-filter';
      chip.textContent = category.label;
      chip.onclick = () => {
        activeCategory = category.id;
        renderView();
      };
      toolbar.appendChild(chip);
    }

    const reset = document.createElement('button');
    reset.textContent = 'Reset board layout';
    reset.onclick = () => {
      placements = board.interactions.starter_layout.map((entry, index) => ({ ...entry, uid: 'seed-' + index }));
      savePlacements();
      renderView();
    };
    toolbar.appendChild(reset);
  } else {
    const info = document.createElement('button');
    info.textContent = 'Back to board to drag and drop';
    info.onclick = () => {
      activeView = 'board';
      activateTab('board');
    };
    toolbar.appendChild(info);
  }
}

function onDrop(zoneId, itemId) {
  const item = findItem(itemId);
  if (!item) return;
  if (!item.accepted_in.includes(zoneId)) {
    setDetail({
      title: item.label,
      meta: 'drop rejected',
      description: 'This element is not intended for the selected zone.',
      files: [item.file, '04_scenes/level_01/interaction-schema.json'],
      tags: item.accepted_in,
      list: ['target zone: ' + zoneId, 'accepted zones: ' + item.accepted_in.join(', ')],
    });
    return;
  }
  placements.push({
    uid: item.id + '-' + Date.now(),
    zone: zoneId,
    item_id: item.id,
    x: 0.5,
    y: 0.5,
  });
  savePlacements();
  renderView();
  setDetail({
    title: item.label,
    meta: 'placed in ' + zoneId,
    description: 'Palette item added to the board layout.',
    files: [item.file],
    tags: [item.category_label, 'drag-and-drop'],
    list: item.triggers ?? [],
  });
}

function renderBoard() {
  const wrapper = document.createElement('div');
  wrapper.className = 'systems-board-layout';

  const palette = document.createElement('section');
  palette.className = 'palette-shell';
  palette.innerHTML = '<h3>Palette</h3><p class="meta-line">Drag an element to a zone. Each item already knows its manifest owner and typical trigger calls.</p>';

  const paletteItems = flattenItems().filter((item) => activeCategory === 'all' || item.category_id === activeCategory);
  const grouped = new Map();
  for (const item of paletteItems) {
    if (!grouped.has(item.category_label)) grouped.set(item.category_label, []);
    grouped.get(item.category_label).push(item);
  }

  for (const [label, items] of grouped) {
    const group = document.createElement('div');
    group.className = 'palette-group';
    group.innerHTML = '<h3>' + escapeHtml(label) + '</h3>';
    const list = document.createElement('div');
    list.className = 'palette-items';

    for (const item of items) {
      const card = document.createElement('article');
      card.className = 'palette-item';
      card.draggable = true;
      card.dataset.itemId = item.id;
      card.innerHTML =
        '<strong>' + escapeHtml(item.label) + '</strong>' +
        '<small>' + escapeHtml(item.accepted_in.join(', ')) + '</small>';
      card.addEventListener('dragstart', (event) => {
        event.dataTransfer?.setData('text/plain', item.id);
      });
      card.onclick = () => {
        selectedTokenId = item.id;
        setDetail({
          title: item.label,
          meta: item.category_label,
          description: 'Palette element ready to be placed on a map zone.',
          files: [item.file],
          tags: item.accepted_in,
          list: item.triggers ?? [],
        });
      };
      list.appendChild(card);
    }

    group.appendChild(list);
    palette.appendChild(group);
  }

  const boardShell = document.createElement('section');
  boardShell.className = 'board-shell';

  const actions = document.createElement('div');
  actions.className = 'board-actions';
  actions.innerHTML = '<button>Local layout persists in your browser</button><button>' + placements.length + ' placed token(s)</button>';
  boardShell.appendChild(actions);

  const zonesWrap = document.createElement('div');
  zonesWrap.className = 'board-zones';

  const scene = board.worlds.worlds[0].regions[0].scenes[0];
  for (const zone of scene.zones) {
    const card = document.createElement('article');
    card.className = 'board-zone';
    card.innerHTML =
      '<h3>' + escapeHtml(zone.label) + '</h3>' +
      '<p class="zone-caption">Accepted: ' + escapeHtml(zone.accepted_categories.join(', ')) + '</p>';
    card.addEventListener('dragover', (event) => {
      event.preventDefault();
      card.classList.add('active-drop');
    });
    card.addEventListener('dragleave', () => card.classList.remove('active-drop'));
    card.addEventListener('drop', (event) => {
      event.preventDefault();
      card.classList.remove('active-drop');
      const itemId = event.dataTransfer?.getData('text/plain');
      if (itemId) onDrop(zone.id, itemId);
    });
    card.onclick = () => {
      setDetail({
        title: zone.label,
        meta: 'zone',
        description: 'Drop target for scene composition and trigger wiring.',
        tags: zone.accepted_categories,
        files: [scene.board_file, scene.assembly_file, '04_scenes/level_01/interaction-schema.json'],
      });
    };

    const tokenList = document.createElement('div');
    tokenList.className = 'zone-token-list';
    const zonePlacements = placements.filter((entry) => entry.zone === zone.id);
    for (const placed of zonePlacements) {
      const item = findItem(placed.item_id);
      if (!item) continue;
      const token = document.createElement('article');
      token.className = 'board-token';
      token.dataset.tokenCategory = item.category_id;
      token.innerHTML =
        '<strong>' + escapeHtml(item.token + ' ' + item.label) + '</strong>' +
        '<small>' + escapeHtml((item.triggers ?? []).join(', ')) + '</small>';
      token.onclick = (event) => {
        event.stopPropagation();
        selectedTokenId = placed.uid;
        setDetail({
          title: item.label,
          meta: zone.label,
          description: 'Placed element on the board. This is a data-first construction token.',
          files: [item.file, '05_runtime/config/trigger-library.json'],
          tags: [item.category_label, zone.id],
          list: [
            'default triggers: ' + (item.triggers ?? []).join(', '),
            'accepted zones: ' + item.accepted_in.join(', '),
            'placement uid: ' + placed.uid,
          ],
        });
      };
      tokenList.appendChild(token);
    }

    if (!zonePlacements.length) {
      const empty = document.createElement('p');
      empty.className = 'meta-line';
      empty.textContent = 'Drop palette items here.';
      tokenList.appendChild(empty);
    }

    card.appendChild(tokenList);
    zonesWrap.appendChild(card);
  }

  boardShell.appendChild(zonesWrap);
  wrapper.appendChild(palette);
  wrapper.appendChild(boardShell);
  return wrapper;
}

function renderAssetCalls() {
  const wrapper = document.createElement('div');
  wrapper.className = 'graph-lanes';
  const lanes = ['source', 'design', 'scene', 'runtime', 'logic', 'feedback', 'delivery'];

  for (const laneId of lanes) {
    const lane = document.createElement('div');
    lane.className = 'graph-lane';
    const laneNodes = board.asset_calls.nodes.filter((node) => node.lane === laneId);
    for (const node of laneNodes) {
      const inbound = board.asset_calls.edges.filter((edge) => edge.to === node.id).map((edge) => edge.from + ' -> ' + edge.label);
      const outbound = board.asset_calls.edges.filter((edge) => edge.from === node.id).map((edge) => edge.label + ' -> ' + edge.to);
      const card = document.createElement('article');
      card.className = 'graph-card';
      card.innerHTML = '<h3>' + escapeHtml(node.label) + '</h3><p>' + escapeHtml(laneId) + '</p>';
      card.onclick = () => setDetail({
        title: node.label,
        meta: 'asset call graph',
        description: 'This node participates in the runtime chain from references to delivery.',
        files: [node.file],
        list: [...inbound, ...outbound],
      });
      lane.appendChild(card);
    }
    wrapper.appendChild(lane);
  }

  return wrapper;
}

function renderTriggers() {
  const wrapper = document.createElement('div');
  wrapper.className = 'trigger-grid';
  for (const group of board.triggers.trigger_groups) {
    for (const template of group.templates) {
      const card = document.createElement('article');
      card.className = 'trigger-card';
      card.innerHTML =
        '<h3>' + escapeHtml(template.event) + '</h3>' +
        '<p>' + escapeHtml(group.label) + '</p>' +
        '<p>' + escapeHtml(template.condition) + '</p>';
      card.onclick = () => setDetail({
        title: template.id,
        meta: group.label,
        description: template.condition,
        files: template.files,
        list: template.actions,
      });
      wrapper.appendChild(card);
    }
  }
  return wrapper;
}

function renderWorlds() {
  const wrapper = document.createElement('div');
  wrapper.className = 'world-grid';
  for (const world of board.worlds.worlds) {
    for (const region of world.regions) {
      for (const scene of region.scenes) {
        const card = document.createElement('article');
        card.className = 'world-card';
        card.innerHTML =
          '<h3>' + escapeHtml(scene.label) + '</h3>' +
          '<p>' + escapeHtml(world.label + ' / ' + region.label) + '</p>';
        const zones = document.createElement('div');
        zones.className = 'world-zones';
        for (const zone of scene.zones) {
          const chip = document.createElement('button');
          chip.className = 'world-zone-chip';
          chip.textContent = zone.label;
          chip.onclick = () => setDetail({
            title: zone.label,
            meta: 'world zone',
            description: 'Zone accepted categories: ' + zone.accepted_categories.join(', '),
            files: [scene.board_file, scene.assembly_file, '05_runtime/config/world-composition.json'],
            tags: zone.accepted_categories,
          });
          zones.appendChild(chip);
        }
        card.appendChild(zones);
        wrapper.appendChild(card);
      }
    }
  }
  return wrapper;
}

function renderRecipes() {
  const wrapper = document.createElement('div');
  wrapper.className = 'recipe-grid';
  for (const recipe of board.recipes) {
    const card = document.createElement('article');
    card.className = 'recipe-card';
    card.innerHTML = '<h3>' + escapeHtml(recipe.label) + '</h3><p>' + escapeHtml(recipe.steps.join(' -> ')) + '</p>';
    card.onclick = () => setDetail({
      title: recipe.label,
      meta: 'runtime recipe',
      description: 'Prebuilt event chain for fast level construction.',
      files: recipe.files,
      list: recipe.steps,
    });
    wrapper.appendChild(card);
  }
  return wrapper;
}

function activateTab(viewId) {
  activeView = viewId;
  for (const tab of tabs) tab.classList.toggle('active', tab.dataset.view === viewId);
  renderToolbar();
  renderView();
}

function renderView() {
  stage.innerHTML = '';
  if (activeView === 'board') {
    viewTitle.textContent = 'Drag and drop board';
    viewDescription.textContent = 'Place addable systems into scene zones and inspect their trigger ownership.';
    stage.appendChild(renderBoard());
    return;
  }
  if (activeView === 'asset_calls') {
    viewTitle.textContent = 'Asset call graph';
    viewDescription.textContent = 'Follow the chain from references to runtime outputs.';
    stage.appendChild(renderAssetCalls());
    return;
  }
  if (activeView === 'triggers') {
    viewTitle.textContent = 'Trigger library';
    viewDescription.textContent = 'Reusable event templates for music, traps, VFX, story, and progression.';
    stage.appendChild(renderTriggers());
    return;
  }
  if (activeView === 'worlds') {
    viewTitle.textContent = 'World hierarchy';
    viewDescription.textContent = 'World > region > scene > zone view for every construction surface.';
    stage.appendChild(renderWorlds());
    return;
  }
  viewTitle.textContent = 'Runtime recipes';
  viewDescription.textContent = 'Prebuilt chain templates to accelerate scene authoring.';
  stage.appendChild(renderRecipes());
}

for (const tab of tabs) {
  tab.onclick = () => activateTab(tab.dataset.view);
}

const manifest = await fetch(manifestUrl).then((res) => res.json());
board = await fetch(manifest.board_url).then((res) => res.json());
placements = loadPlacements();
setDetail({
  title: 'Systems board ready',
  meta: 'workspace surface',
  description: 'Use the board tab to drag palette items onto zones, then inspect their files and trigger chains.',
  files: ['08_ops/manifests/systems-board.json', '05_runtime/config/trigger-library.json'],
  list: ['drag palette item', 'drop in zone', 'inspect details', 'switch to asset calls or triggers'],
});
activateTab('board');
