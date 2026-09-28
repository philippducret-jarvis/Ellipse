import { HEROES } from './heroes.mjs';
import { createLab, cast, canCast, tick, setIncoming } from './hero-lab.mjs';

const $ = (id) => document.getElementById(id);
const base = '../../';
const asset = (h) => `${base}03_assets/characters/${h.id}/presentation-v1.png`;
const ref = (path) => `${base}01_inputs/references/${path.split('/').map(encodeURIComponent).join('/')}`;
const fmt = (n) => Math.round(n).toLocaleString('fr-FR');
let state = createLab();
let selected = HEROES[0];
let referenceMode = 'reference';
let feedbackTimer;
const rosterButtons = new Map();
const partyButtons = new Map();
const actionButtons = [];

for (const [index, h] of HEROES.entries()) {
  const button = document.createElement('button');
  button.className = 'roster-card';
  button.style.setProperty('--card-accent', h.accent);
  button.setAttribute('aria-label', `Choisir ${h.name}`);
  button.innerHTML = `<img src="${asset(h)}" alt="" loading="lazy"><span><strong>${h.name}</strong><small>${h.role}</small></span>`;
  button.addEventListener('click', () => select(h.id));
  $('roster').append(button);
  rosterButtons.set(h.id, button);
  const party = document.createElement('button');
  party.className = 'party-member';
  party.style.setProperty('--accent', h.accent);
  party.setAttribute('aria-label', `Activer ${h.name} dans le banc`);
  party.innerHTML = `<strong>${h.name}<span class="hp-number"></span></strong><div class="bar"><i></i></div><small class="resources"></small><div class="bar energy"><i></i></div>`;
  party.addEventListener('click', () => select(h.id));
  $('party').append(party);
  partyButtons.set(h.id, party);
}
for (let i = 0; i < 3; i++) {
  const button = document.createElement('button');
  button.className = 'cast';
  button.innerHTML = `<span>${i + 1}</span><strong></strong><p></p><small></small>`;
  button.addEventListener('click', () => castSkill(i));
  $('cast-actions').append(button);
  actionButtons.push(button);
}
function select(id) {
  selected = HEROES.find((h) => h.id === id) ?? HEROES[0];
  state.selected = selected.id;
  document.documentElement.style.setProperty('--accent', selected.accent);
  $('hero-art').src = asset(selected);
  $('hero-art').alt = `${selected.name} — première base HD, personnage entier`;
  $('hero-name').textContent = selected.name;
  $('hero-title').textContent = selected.title;
  $('hero-number').textContent = `0${HEROES.indexOf(selected) + 1} / 04`;
  $('hero-tags').replaceChildren(...[selected.element, selected.role].map((tag) => { const node = document.createElement('span'); node.textContent = tag; return node; }));
  $('hero-quote').textContent = `« ${selected.quote} »`;
  $('hero-description').textContent = selected.description;
  $('invariants').replaceChildren(...selected.invariants.map((text) => {const li = document.createElement('li'); li.textContent = text; return li;}));
  $('skill-summary').innerHTML = selected.skills.map((s, i) => `<div class="skill-tile"><span>${[selected.symbol, '✦', '✧'][i]}</span><strong>${s.name}</strong><small>${s.cost ? 'ULTIME · 100 ÉNERGIE' : `RECHARGE · ${s.cooldown} S`}</small></div>`).join('');
  for (const h of HEROES) {
    rosterButtons.get(h.id).setAttribute('aria-pressed', String(h.id === selected.id));
    partyButtons.get(h.id).setAttribute('aria-pressed', String(h.id === selected.id));
  }
  $('active-caster').textContent = `${selected.name} · ${selected.role}`;
  selected.skills.forEach((skill, i) => {
    actionButtons[i].querySelector('strong').textContent = skill.name;
    actionButtons[i].querySelector('p').textContent = skill.description;
  });
  try {localStorage.setItem('shadow-echoes:lot01:hero', selected.id);} catch {}
  renderLab();
}
function castSkill(index) {
  const skill = selected.skills[index];
  const result = cast(state, selected.id, skill.id);
  $('cast-feedback').textContent = result.ok ? `${selected.name} utilise ${skill.name}.` : result.reason;
  if (result.ok) {
    document.querySelector('.target-panel').classList.add('hit');
    clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => document.querySelector('.target-panel').classList.remove('hit'), 260);
  }
  renderLab();
}
function renderLab() {
  for (const h of HEROES) {
    const member = state.heroes[h.id];
    const button = partyButtons.get(h.id);
    button.querySelector('.hp-number').textContent = `${fmt(member.hp)} / ${fmt(member.maxHp)}`;
    button.querySelector('.bar i').style.width = `${member.hp / member.maxHp * 100}%`;
    button.querySelector('.energy i').style.width = `${member.energy}%`;
    button.querySelector('.resources').textContent = `Énergie ${member.energy}/100 · Bouclier ${member.shield}`;
  }
  $('elapsed').textContent = `${state.time.toFixed(1).replace('.', ',')} s`;
  $('target-health').textContent = `${fmt(state.target.hp)} / ${fmt(state.target.maxHp)} PV`;
  $('target-bar').style.width = `${state.target.hp / state.target.maxHp * 100}%`;
  $('target-state').textContent = state.target.hp <= 0 ? 'Vaincue' : state.target.controlledUntil > state.time ? 'Contrôlée' : state.incoming ? 'Ripostes actives' : 'Passive';
  $('total-damage').textContent = fmt(state.totalDamage);
  $('total-healing').textContent = fmt(state.totalHealing);
  for (let i = 0; i < 3; i++) {
    const skill = selected.skills[i];
    const check = canCast(state, selected.id, skill.id);
    actionButtons[i].disabled = !check.ok;
    actionButtons[i].querySelector('small').textContent = check.ok ? 'Prête à lancer' : check.reason;
  }
  const logKey = JSON.stringify(state.log);
  if ($('log').dataset.key !== logKey) {
    $('log').replaceChildren(...state.log.map((entry) => { const li = document.createElement('li'); li.textContent = `${entry.time.toFixed(1)} s — ${entry.message}`; return li; }));
    $('log').dataset.key = logKey;
  }
}
$('incoming').addEventListener('change', (event) => {setIncoming(state, event.target.checked); renderLab();});
$('pause').addEventListener('click', () => {state.paused = !state.paused; $('pause').textContent = state.paused ? 'Reprendre' : 'Pause'; renderLab();});
$('reset').addEventListener('click', () => {
  state = createLab(); state.selected = selected.id;
  $('incoming').checked = false; $('pause').textContent = 'Pause';
  $('cast-feedback').textContent = 'Équipe et cible réinitialisées.'; renderLab();
});
function updateComparison() {
  const reference = ref(selected[referenceMode]);
  $('dialog-title').textContent = `${selected.name} · ${selected.title}`;
  $('reference-art').src = reference; $('open-reference').href = reference;
  $('compare-art').src = asset(selected); $('open-master').href = asset(selected);
  $('reference-sheet').setAttribute('aria-pressed', String(referenceMode === 'reference'));
  $('reference-board').setAttribute('aria-pressed', String(referenceMode === 'board'));
}
function openComparison() {
  referenceMode = 'reference'; $('zoom').value = '1'; applyZoom(); updateComparison();
  $('art-dialog').showModal();
}
function applyZoom() {
  const scale = Number($('zoom').value);
  for (const img of [$('reference-art'), $('compare-art')]) {img.style.width = `${scale * 100}%`; img.style.height = `${scale * 100}%`;}
}
$('compare').addEventListener('click', openComparison);
$('inspect').addEventListener('click', openComparison);
$('close-dialog').addEventListener('click', () => $('art-dialog').close());
$('reference-sheet').addEventListener('click', () => {referenceMode = 'reference'; updateComparison();});
$('reference-board').addEventListener('click', () => {referenceMode = 'board'; updateComparison();});
$('zoom').addEventListener('input', applyZoom);
$('try-skills').addEventListener('click', () => {$('lab').scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'}); actionButtons.find((b) => !b.disabled)?.focus({preventScroll: true});});
document.addEventListener('keydown', (event) => {
  if ($('art-dialog').open || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
  if (['1','2','3'].includes(event.key)) {event.preventDefault(); castSkill(Number(event.key) - 1);}
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {event.preventDefault(); select(HEROES[(HEROES.indexOf(selected) + (event.key === 'ArrowRight' ? 1 : 3)) % 4].id);}
});
let last = performance.now();
let lastDraw = last;
function frame(now) {
  if (!document.hidden && !$('art-dialog').open) tick(state, Math.max(0,Math.min((now - last) / 1000, 0.1)));
  last = now;
  if (now - lastDraw > 80) {renderLab(); lastDraw = now;}
  requestAnimationFrame(frame);
}
document.addEventListener('visibilitychange', () => {last = performance.now();});
let stored;
try {stored = localStorage.getItem('shadow-echoes:lot01:hero');} catch {}
select(stored); requestAnimationFrame(frame);
