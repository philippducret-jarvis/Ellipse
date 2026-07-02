const manifestUrl = './operating-model.manifest.json';
const tabs = [...document.querySelectorAll('.op-tabs button')];
const stage = document.getElementById('op-stage');
const detail = document.getElementById('op-detail');
const titleNode = document.getElementById('op-title');
const descriptionNode = document.getElementById('op-description');
let model = null;
let activeView = 'progression';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function setDetail(payload) {
  const list = (payload.list ?? []).map((entry) => '<li>' + escapeHtml(entry) + '</li>').join('');
  const tags = (payload.tags ?? []).map((tag) => '<span class="op-tag">' + escapeHtml(tag) + '</span>').join('');
  const files = (payload.files ?? []).map((file) => '<a class="op-detail-file" href="/workspaces/echoes-of-the-mushroom-realm/' + file + '" target="_blank" rel="noreferrer">' + escapeHtml(file) + '</a>').join('');
  detail.innerHTML =
    '<h3>' + escapeHtml(payload.title ?? 'Details') + '</h3>' +
    (payload.meta ? '<p class="meta-line">' + escapeHtml(payload.meta) + '</p>' : '') +
    (payload.description ? '<p>' + escapeHtml(payload.description) + '</p>' : '') +
    (tags ? '<div class="op-tags">' + tags + '</div>' : '') +
    (list ? '<ul>' + list + '</ul>' : '') +
    (files ? '<div class="op-files">' + files + '</div>' : '');
}

function createCard(title, meta, body, onClick) {
  const card = document.createElement('article');
  card.className = 'op-card';
  card.innerHTML = '<h3>' + escapeHtml(title) + '</h3>' + (meta ? '<p class="meta-line">' + escapeHtml(meta) + '</p>' : '') + body;
  if (onClick) card.onclick = onClick;
  return card;
}

function renderProgression() {
  titleNode.textContent = 'Progression and economy';
  descriptionNode.textContent = 'Stats, currencies, reward streams, and long-term mastery tracks.';
  const wrap = document.createElement('div');
  wrap.className = 'op-grid-cards';

  for (const stat of model.progression.player_stats) {
    wrap.appendChild(createCard(stat.id, 'player stat', '<p>Base: ' + escapeHtml(String(stat.base)) + '</p><p>Growth: ' + escapeHtml(stat.growth) + '</p>', () => {
      setDetail({ title: stat.id, meta: 'player stat', description: 'Persistent stat track.', list: ['base: ' + stat.base, 'growth: ' + stat.growth], files: ['05_runtime/config/progression-economy.json'] });
    }));
  }
  for (const currency of model.progression.currencies) {
    wrap.appendChild(createCard(currency.id, 'currency', '<p>' + escapeHtml(currency.use.join(', ')) + '</p>', () => {
      setDetail({ title: currency.id, meta: 'currency', description: 'Economy currency usage.', list: currency.use, files: ['05_runtime/config/progression-economy.json'] });
    }));
  }
  for (const track of model.progression.progression_tracks) {
    wrap.appendChild(createCard(track.id, 'progression track', '<p>' + escapeHtml(track.nodes.join(' -> ')) + '</p>', () => {
      setDetail({ title: track.id, meta: 'progression track', description: 'Unlock line for the player.', list: track.nodes, files: ['05_runtime/config/progression-economy.json'] });
    }));
  }
  return wrap;
}

function renderSave() {
  titleNode.textContent = 'Save and profile contracts';
  descriptionNode.textContent = 'What persists, when it persists, and how accessibility carries across sessions.';
  const wrap = document.createElement('div');
  wrap.className = 'op-grid-cards';
  for (const [group, fields] of Object.entries(model.save_profile.schema)) {
    wrap.appendChild(createCard(group, 'save schema', '<p>' + escapeHtml(fields.join(', ')) + '</p>', () => {
      setDetail({ title: group, meta: 'save schema', description: 'Stored fields for this profile group.', list: fields, files: ['05_runtime/config/save-profile.schema.json'] });
    }));
  }
  wrap.appendChild(createCard('Policies', 'save policy', '<p>' + escapeHtml(model.save_profile.policies.join(' | ')) + '</p>', () => {
    setDetail({ title: 'Save policies', meta: 'runtime persistence', description: 'Global save rules.', list: model.save_profile.policies, files: ['05_runtime/config/save-profile.schema.json'] });
  }));
  return wrap;
}

function renderQuests() {
  titleNode.textContent = 'Quests and story arcs';
  descriptionNode.textContent = 'Main and secondary arcs, plus the states each quest can occupy.';
  const wrap = document.createElement('div');
  wrap.className = 'op-quest-grid';
  for (const arc of model.quests.arcs) {
    wrap.appendChild(createCard(arc.label, arc.id, '<p>' + escapeHtml(arc.beats.join(' -> ')) + '</p>', () => {
      setDetail({ title: arc.label, meta: arc.id, description: 'Quest arc beat chain.', list: arc.beats, tags: model.quests.quest_states, files: ['05_runtime/config/quest-graph.json', '05_runtime/config/story-graph.json'] });
    }));
  }
  return wrap;
}

function renderWorld() {
  titleNode.textContent = 'World state machine';
  descriptionNode.textContent = 'Reactive axes that change tone, enemies, secrets, and atmosphere over time.';
  const wrap = document.createElement('div');
  wrap.className = 'op-axis-grid';
  for (const axis of model.world_state.axes) {
    wrap.appendChild(createCard(axis.id, 'world axis', '<p>' + escapeHtml(axis.effects.join(', ')) + '</p>', () => {
      setDetail({ title: axis.id, meta: 'world axis', description: 'Reactive world driver.', list: axis.effects, files: ['05_runtime/config/world-state-machine.json', '05_runtime/config/fx-presets.json', '05_runtime/config/audio-banks.json'] });
    }));
  }
  for (const hook of model.world_state.region_hooks) {
    wrap.appendChild(createCard(hook.region, 'region hook', '<p>Primary axis: ' + escapeHtml(hook.primary_axis) + '</p>', () => {
      setDetail({ title: hook.region, meta: 'region hook', description: 'Region to world-axis mapping.', list: ['primary axis: ' + hook.primary_axis], files: ['05_runtime/config/world-state-machine.json', '05_runtime/config/world-composition.json'] });
    }));
  }
  return wrap;
}

function renderAccessibility() {
  titleNode.textContent = 'Accessibility and localization';
  descriptionNode.textContent = 'Presets, UI constraints, and launch language strategy.';
  const wrap = document.createElement('div');
  wrap.className = 'op-access-grid';
  for (const preset of model.accessibility.presets) {
    wrap.appendChild(createCard(preset.label, preset.id, '<p>' + escapeHtml(Object.entries(preset.settings).map(([k, v]) => k + ': ' + v).join(' | ')) + '</p>', () => {
      setDetail({ title: preset.label, meta: preset.id, description: 'Accessibility preset.', list: Object.entries(preset.settings).map(([k, v]) => k + ': ' + v), files: ['05_runtime/config/accessibility-presets.json'] });
    }));
  }
  wrap.appendChild(createCard('Localization', model.localization.source_language + ' source', '<p>Launch: ' + escapeHtml(model.localization.launch_languages.join(', ')) + '</p><p>Expansion: ' + escapeHtml(model.localization.expansion_languages.join(', ')) + '</p>', () => {
    setDetail({ title: 'Localization plan', meta: 'content pipeline', description: 'Language rollout and formatting rules.', list: [...model.localization.content_domains, ...model.localization.formatting_rules], files: ['05_runtime/config/localization-plan.json'] });
  }));
  return wrap;
}

function renderBuilds() {
  titleNode.textContent = 'Build channels and telemetry';
  descriptionNode.textContent = 'Release channels, gates, and the analytics used to balance the game.';
  const wrap = document.createElement('div');
  wrap.className = 'op-build-grid';
  for (const channel of model.builds.channels) {
    wrap.appendChild(createCard(channel.id, 'build channel', '<p>' + escapeHtml(channel.purpose) + '</p><p>' + escapeHtml(channel.quality) + '</p>', () => {
      setDetail({ title: channel.id, meta: 'build channel', description: channel.purpose, list: ['quality: ' + channel.quality], files: ['05_runtime/config/build-targets.json', '05_runtime/config/mobile-presets.json'] });
    }));
  }
  wrap.appendChild(createCard('Release gates', 'shipping', '<p>' + escapeHtml(model.builds.release_gates.join(', ')) + '</p>', () => {
    setDetail({ title: 'Release gates', meta: 'shipping', description: 'Conditions before a release can move forward.', list: model.builds.release_gates, files: ['05_runtime/config/build-targets.json', '06_qa/checklists/production-gates.json'] });
  }));
  wrap.appendChild(createCard('Telemetry', 'balancing', '<p>' + escapeHtml(model.telemetry.events.map((event) => event.id).join(', ')) + '</p>', () => {
    setDetail({ title: 'Telemetry plan', meta: 'balancing', description: 'Signals used to iterate on the game.', list: [...model.telemetry.events.map((event) => event.id + ': ' + event.purpose), ...model.telemetry.dashboards, ...model.telemetry.privacy_rules], files: ['05_runtime/config/telemetry-plan.json'] });
  }));
  return wrap;
}

function activateTab(viewId) {
  activeView = viewId;
  for (const tab of tabs) tab.classList.toggle('active', tab.dataset.view === viewId);
  renderView();
}

function renderView() {
  stage.innerHTML = '';
  if (activeView === 'progression') stage.appendChild(renderProgression());
  if (activeView === 'save') stage.appendChild(renderSave());
  if (activeView === 'quests') stage.appendChild(renderQuests());
  if (activeView === 'world') stage.appendChild(renderWorld());
  if (activeView === 'accessibility') stage.appendChild(renderAccessibility());
  if (activeView === 'builds') stage.appendChild(renderBuilds());
}

for (const tab of tabs) tab.onclick = () => activateTab(tab.dataset.view);

const manifest = await fetch(manifestUrl).then((res) => res.json());
model = await fetch(manifest.model_url).then((res) => res.json());
setDetail({
  title: 'Operating model ready',
  meta: 'game operating system',
  description: 'This surface organizes progression, save, world state, accessibility, localization, and shipping channels.',
  list: ['open progression', 'inspect save groups', 'review quest arcs', 'check build channels'],
  files: ['08_ops/manifests/game-operating-model.json', '02_design/specs/game-operating-model.md'],
});
activateTab('progression');
