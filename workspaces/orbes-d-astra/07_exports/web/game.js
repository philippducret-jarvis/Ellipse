import {
  ABILITY_CAST_EVENT,
  MergeDropEngine,
  OPEN_GALLERY_EVENT,
  OPEN_RELIQUARY_EVENT,
  OPEN_SUMMON_EVENT,
  RUN_RESULT_EVENT,
} from './engine/ellipse-engine.js';

const mount = document.querySelector('#game');
const status = document.querySelector('#boot-status');
const menu = document.querySelector('#experience-screen');
const content = document.querySelector('#experience-content');
const stage = document.querySelector('#game-stage');
const hubButton = document.querySelector('#hub-button');
const restartButton = document.querySelector('#stage-restart');
const missionTitle = document.querySelector('#stage-mission-title');
const missionObjective = document.querySelector('#stage-mission-objective');
const missionReward = document.querySelector('#stage-mission-reward');
const stageSquad = document.querySelector('#stage-squad');
const superOverlay = document.querySelector('#super-overlay');
const superHeroName = document.querySelector('#super-hero-name');
const superAbilityName = document.querySelector('#super-ability-name');

const CAMPAIGN_KEY = 'ellipse.orbes-astra.campaign';
const SAVE_VERSION = 3;
const RARITY_COLORS = { R: '#5eead4', SR: '#c084fc', SSR: '#facc15' };
const BANNERS = {
  solveig: { id: 'solveig', name: 'Danse de l’Aurore', featured: 'solveig', eyebrow: 'ÉVÉNEMENT LIMITÉ', accent: '#fb923c', copy: 'Solveig enveloppe chaque cascade d’une aurore qui double les fusions.' },
  seraphiel: { id: 'seraphiel', name: 'Les Sept Soleils', featured: 'seraphiel', eyebrow: 'INVOCATION CÉLESTE', accent: '#fde68a', copy: 'Séraphiel frappe le Léviathan d’une pluie de sentences solaires.' },
  standard: { id: 'standard', name: 'Appel du Nexus', featured: undefined, eyebrow: 'BANNIÈRE PERMANENTE', accent: '#67e8f9', copy: 'Les vingt-quatre Gardiens peuvent répondre à l’appel du Sanctuaire.' },
};

const CHAPTERS = [
  {
    id: 'c1', number: 'I', title: 'La Rade des étoiles noyées', realm: 'Royaume des Marées', accent: '#2dd4bf',
    story: 'Mira suit un chant englouti jusqu’au premier fragment du Nexus.',
    missions: [
      { id: 'c1-1', code: '1-1', name: 'Premier éclat', kind: 'Histoire', rules: { mode: 'nexus', target_tier: 2, objective_label: 'Créer Séla, l’Astre lunaire', reward_currency: 120, reward_essence: 5 } },
      { id: 'c1-2', code: '1-2', name: 'Courants croisés', kind: 'Score', rules: { mode: 'score', target_score: 500, objective_label: 'Atteindre 500 points', reward_currency: 140, reward_essence: 5 } },
      { id: 'c1-3', code: '1-3', name: 'Le phare éteint', kind: 'Histoire', rules: { mode: 'nexus', target_tier: 3, objective_label: 'Réunir Kori, l’esprit comète', reward_currency: 160, reward_essence: 8, gravity_multiplier: 1.06 } },
      { id: 'c1-4', code: '1-4', name: 'Marée haute', kind: 'Survie', rules: { mode: 'survival', time_limit_ms: 45000, objective_label: 'Tenir 45 secondes', reward_currency: 180, reward_essence: 8, gravity_multiplier: 1.12 } },
      { id: 'c1-5', code: '1-5', name: 'Chœur des abysses', kind: 'Chrono', rules: { mode: 'score', target_score: 1200, time_limit_ms: 75000, objective_label: '1 200 points en 75 secondes', reward_currency: 220, reward_essence: 10 } },
      { id: 'c1-6', code: 'BOSS', name: 'Léviathan des Marées', kind: 'Boss', boss: true, rules: { mode: 'boss', boss_id: 'tide_leviathan', boss_name: 'Léviathan des Marées', boss_max_hp: 1100, time_limit_ms: 120000, objective_label: 'Briser le cœur du Léviathan', reward_currency: 420, reward_essence: 35, hazard_interval_ms: 10500 } },
    ],
  },
  {
    id: 'c2', number: 'II', title: 'La Forge du soleil mort', realm: 'Citadelle Solaire', accent: '#fb923c',
    story: 'Brann rallume les fourneaux célestes tandis que les astres deviennent instables.',
    missions: [
      { id: 'c2-1', code: '2-1', name: 'Braises orbitales', kind: 'Histoire', rules: { mode: 'nexus', target_tier: 4, objective_label: 'Forger Hélio, l’Astre solaire', reward_currency: 200, reward_essence: 10, gravity_multiplier: 1.08 } },
      { id: 'c2-2', code: '2-2', name: 'Métal en fusion', kind: 'Score', rules: { mode: 'score', target_score: 1800, objective_label: 'Atteindre 1 800 points', reward_currency: 230, reward_essence: 12, drop_cooldown_multiplier: 0.9 } },
      { id: 'c2-3', code: '2-3', name: 'Pluie de scories', kind: 'Survie', rules: { mode: 'survival', time_limit_ms: 60000, objective_label: 'Tenir 60 secondes', reward_currency: 250, reward_essence: 14, gravity_multiplier: 1.2, overflow_grace_multiplier: 0.9 } },
      { id: 'c2-4', code: '2-4', name: 'Couronne naine', kind: 'Histoire', rules: { mode: 'nexus', target_tier: 5, objective_label: 'Réunir Auriel, la Couronne', reward_currency: 280, reward_essence: 16 } },
      { id: 'c2-5', code: '2-5', name: 'Fournaise parfaite', kind: 'Chrono', rules: { mode: 'score', target_score: 2800, time_limit_ms: 85000, objective_label: '2 800 points en 85 secondes', reward_currency: 320, reward_essence: 18, gravity_multiplier: 1.15 } },
      { id: 'c2-6', code: 'BOSS', name: 'Golem de l’Éclipse', kind: 'Boss', boss: true, rules: { mode: 'boss', boss_id: 'eclipse_golem', boss_name: 'Golem de l’Éclipse', boss_max_hp: 2300, time_limit_ms: 150000, objective_label: 'Fendre l’armure d’éclipse', reward_currency: 520, reward_essence: 55, hazard_interval_ms: 8500, gravity_multiplier: 1.12 } },
    ],
  },
  {
    id: 'c3', number: 'III', title: 'Le Royaume derrière la Nuit', realm: 'Frontière du Vide', accent: '#a78bfa',
    story: 'Aster conduit les Gardiens au-delà du ciel connu pour affronter la fracture originelle.',
    missions: [
      { id: 'c3-1', code: '3-1', name: 'Jardin inversé', kind: 'Histoire', rules: { mode: 'nexus', target_tier: 5, objective_label: 'Restaurer la Couronne inversée', reward_currency: 300, reward_essence: 18, gravity_multiplier: 1.18 } },
      { id: 'c3-2', code: '3-2', name: 'Échos impossibles', kind: 'Score', rules: { mode: 'score', target_score: 3600, objective_label: 'Atteindre 3 600 points', reward_currency: 340, reward_essence: 20, drop_cooldown_multiplier: 0.82 } },
      { id: 'c3-3', code: '3-3', name: 'La minute noire', kind: 'Survie', rules: { mode: 'survival', time_limit_ms: 75000, objective_label: 'Tenir 75 secondes', reward_currency: 380, reward_essence: 24, gravity_multiplier: 1.28, overflow_grace_multiplier: 0.78 } },
      { id: 'c3-4', code: '3-4', name: 'Le Monde se souvient', kind: 'Histoire', rules: { mode: 'nexus', target_tier: 6, objective_label: 'Réunir Gaïa, l’Astre-monde', reward_currency: 420, reward_essence: 28 } },
      { id: 'c3-5', code: '3-5', name: 'Route du Nexus', kind: 'Chrono', rules: { mode: 'score', target_score: 5200, time_limit_ms: 110000, objective_label: '5 200 points en 110 secondes', reward_currency: 480, reward_essence: 32, gravity_multiplier: 1.22 } },
      { id: 'c3-6', code: 'BOSS', name: 'Abyssion, Nuit primordiale', kind: 'Boss final', boss: true, rules: { mode: 'boss', boss_id: 'abyssion', boss_name: 'Abyssion', boss_max_hp: 4600, time_limit_ms: 180000, objective_label: 'Rallumer le Nexus', reward_currency: 900, reward_essence: 100, hazard_interval_ms: 6500, gravity_multiplier: 1.2, overflow_grace_multiplier: 0.86 } },
    ],
  },
];

const CHALLENGES = [
  { id: 'rift-blitz', code: 'BLITZ', name: 'Faille éclair', kind: 'Défi quotidien', icon: '⚡', rules: { mode: 'score', target_score: 2400, time_limit_ms: 60000, objective_label: '2 400 points en 60 secondes', reward_currency: 260, reward_essence: 12, drop_cooldown_multiplier: 0.76 } },
  { id: 'astral-survival', code: 'SURVIE', name: 'Tempête astrale', kind: 'Épreuve', icon: '◌', rules: { mode: 'survival', time_limit_ms: 90000, objective_label: 'Tenir 90 secondes', reward_currency: 340, reward_essence: 20, gravity_multiplier: 1.32, overflow_grace_multiplier: 0.8 } },
  { id: 'weekly-leviathan', code: 'RAID', name: 'Léviathan du Vide', kind: 'Boss hebdomadaire', icon: '♜', boss: true, rules: { mode: 'boss', boss_id: 'weekly_leviathan', boss_name: 'Léviathan du Vide', boss_max_hp: 3600, time_limit_ms: 180000, objective_label: 'Vaincre le raid avant la rupture', reward_currency: 650, reward_essence: 65, hazard_interval_ms: 7000, gravity_multiplier: 1.18 } },
];

const ALL_MISSIONS = CHAPTERS.flatMap((chapter) => chapter.missions);
let engine;
let gdl;
let currentScreen = 'boot';
let currentRun = null;
let pendingResult = null;
let resultTimer = 0;
let introSlide = 0;
let activeBanner = 'solveig';
let galleryFilter = 'Tous';
let memoryGame = null;
let memoryLocked = false;
let memoryTimer = 0;
let alignmentGame = null;
let alignmentFrame = 0;
let summoning = false;
let audioContext;

function playSfx(kind) {
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return;
  audioContext ??= new AudioCtor();
  if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
  const patterns = {
    tap: [[440, 0, .035]],
    launch: [[220, 0, .12], [330, .08, .16], [520, .18, .2]],
    summon: [[196, 0, .2], [294, .16, .22], [440, .34, .35]],
    rare: [[392, 0, .18], [523, .14, .2], [784, .31, .5]],
    match: [[523, 0, .1], [659, .08, .16]],
    perfect: [[440, 0, .12], [660, .09, .16], [880, .2, .24]],
  };
  const now = audioContext.currentTime;
  for (const [frequency, delay, duration] of patterns[kind] ?? patterns.tap) {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = kind === 'summon' || kind === 'rare' ? 'sine' : 'triangle';
    oscillator.frequency.setValueAtTime(frequency, now + delay);
    gain.gain.setValueAtTime(.0001, now + delay);
    gain.gain.exponentialRampToValueAtTime(.055, now + delay + .015);
    gain.gain.exponentialRampToValueAtTime(.0001, now + delay + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now + delay);
    oscillator.stop(now + delay + duration + .02);
  }
}

function todayKey() {
  return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(new Date());
}

function baseCampaign() {
  return {
    version: SAVE_VERSION,
    introSeen: false,
    completed: {},
    stars: {},
    challengeBest: {},
    minigameBest: { memory: 0, alignment: 0 },
    minigameClaims: {},
    dailyGift: '',
  };
}

function campaign() {
  const fallback = baseCampaign();
  try {
    const parsed = JSON.parse(localStorage.getItem(CAMPAIGN_KEY) || 'null');
    if (!parsed || typeof parsed !== 'object') return fallback;
    return {
      ...fallback,
      ...parsed,
      version: SAVE_VERSION,
      completed: { ...fallback.completed, ...(parsed.completed || {}) },
      stars: { ...fallback.stars, ...(parsed.stars || {}) },
      challengeBest: { ...fallback.challengeBest, ...(parsed.challengeBest || {}) },
      minigameBest: { ...fallback.minigameBest, ...(parsed.minigameBest || {}) },
      minigameClaims: { ...fallback.minigameClaims, ...(parsed.minigameClaims || {}) },
    };
  } catch {
    return fallback;
  }
}

function saveCampaign(next) {
  localStorage.setItem(CAMPAIGN_KEY, JSON.stringify({ ...baseCampaign(), ...next, version: SAVE_VERSION }));
}

function patchCampaign(patch) {
  const current = campaign();
  const next = { ...current, ...patch };
  saveCampaign(next);
  return next;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function world() {
  return engine?.getWorld();
}

function heroById(id) {
  return world()?.config.heroes.find((hero) => hero.id === id);
}

function itemById(kind, id) {
  const w = world();
  if (!w) return undefined;
  return (kind === 'relic' ? w.config.relics : w.config.companions).find((item) => item.id === id);
}

function heroStars(id) {
  const stars = world()?.hero_stars?.[id] ?? 0;
  return Math.max(0, Math.min(world()?.config.evolution_max_stars ?? 5, Math.floor(stars)));
}

function starBar(id) {
  const max = world()?.config.evolution_max_stars ?? 5;
  const stars = heroStars(id);
  return '★'.repeat(stars) + '☆'.repeat(Math.max(0, max - stars));
}

function portraitStyle(hero) {
  if (!hero?.portrait || typeof hero.portrait_frame !== 'number') return `--portrait-color:${hero?.color ?? '#64748b'}`;
  const frame = Math.max(0, Math.floor(hero.portrait_frame));
  return `background-image:url('./assets/guardians/guardian-${String(frame).padStart(2, '0')}.png');--portrait-color:${hero.color}`;
}

function portraitHtml(hero, size = 'md', extra = '') {
  const letter = (hero?.name ?? '?').slice(0, 1);
  return `<span class="card-portrait sheet ${size} ${extra}" style="${portraitStyle(hero)}"><i>${hero?.portrait ? '' : letter}</i></span>`;
}

function topbar(label, back = 'hub') {
  const w = world();
  return `<header class="app-topbar">
    <button class="round-action" data-action="${back}" aria-label="Retour">←</button>
    <span><small>ORBeS D’ASTRA</small><strong>${label}</strong></span>
    <div class="wallet-pill"><b>${w?.currency ?? 0}</b> ✦ <b>${w?.essence ?? 0}</b> ◈</div>
  </header>`;
}

function dock(active = 'hub') {
  const items = [
    ['campaign', '✦', 'Aventure'],
    ['sanctuaire', '☼', 'Invocation'],
    ['hub', '⌂', 'Observatoire'],
    ['galerie', '☽', 'Gardiens'],
    ['challenges', '♜', 'Défis'],
  ];
  return `<nav class="app-dock" aria-label="Navigation principale">${items.map(([action, icon, label]) => `
    <button data-action="${action}" class="${active === action ? 'active' : ''}"><i>${icon}</i><span>${label}</span></button>`).join('')}</nav>`;
}

function objectiveFor(rules) {
  if (rules.objective_label) return rules.objective_label;
  if (rules.mode === 'boss') return `Vaincre ${rules.boss_name}`;
  if (rules.mode === 'survival') return `Survivre ${Math.round((rules.time_limit_ms ?? 0) / 1000)} secondes`;
  if (rules.mode === 'score') return `Atteindre ${rules.target_score} points`;
  return 'Restaurer la constellation';
}

function missionById(id) {
  return ALL_MISSIONS.find((mission) => mission.id === id) || CHALLENGES.find((challenge) => challenge.id === id);
}

function missionIndex(id) {
  return ALL_MISSIONS.findIndex((mission) => mission.id === id);
}

function isMissionUnlocked(id) {
  const index = missionIndex(id);
  if (index <= 0) return true;
  return Boolean(campaign().completed[ALL_MISSIONS[index - 1].id]);
}

function progressSummary() {
  const c = campaign();
  const completed = ALL_MISSIONS.filter((mission) => c.completed[mission.id]).length;
  const stars = Object.values(c.stars).reduce((sum, value) => sum + Number(value || 0), 0);
  return { completed, stars, percent: Math.round((completed / ALL_MISSIONS.length) * 100) };
}

function renderIntro() {
  const slides = [
    {
      kicker: 'PROLOGUE · LE CIEL BRISÉ',
      title: 'Le Nexus chantait autrefois.',
      copy: 'Chaque constellation était une voix. Puis Abyssion dévora la lumière et les étoiles tombèrent sur Astra.',
      speaker: 'La Chronique céleste',
      hero: 'elya',
      tone: 'dawn',
    },
    {
      kicker: 'LA LOI DE LA RÉUNION',
      title: 'Deux fragments peuvent se souvenir.',
      copy: 'Quand deux Astres jumeaux se touchent, ils fusionnent et retrouvent une forme plus ancienne, plus puissante.',
      speaker: 'Mira · Tisseuse de gravité',
      hero: 'mira',
      tone: 'tide',
    },
    {
      kicker: 'LA NUIT PRIMORDIALE',
      title: 'Quelque chose veille dans la fracture.',
      copy: 'Les Léviathans avancent de royaume en royaume. Réunissez les Gardiens avant que le dernier ciel ne s’éteigne.',
      speaker: 'Aster · Héritière du Nexus',
      hero: 'aster',
      tone: 'void',
    },
    {
      kicker: 'VOTRE OBSERVATOIRE',
      title: 'Rallumez le ciel.',
      copy: 'Menez vingt-quatre Gardiens, maîtrisez le Puits et ouvrez une route jusqu’au cœur d’Abyssion.',
      speaker: 'Le pacte commence maintenant',
      hero: 'solveig',
      tone: 'aurora',
    },
  ];
  const slide = slides[Math.min(introSlide, slides.length - 1)];
  const hero = heroById(slide.hero) ?? world()?.config.heroes[0];
  content.innerHTML = `<section class="cinematic-intro tone-${slide.tone}">
    <div class="cinematic-sky"><div class="cinematic-nebula"></div><div class="cinematic-stars"></div></div>
    <div class="cinematic-character">${portraitHtml(hero, 'cinematic', 'is-breathing')}<div class="character-rim"></div></div>
    <button class="cinematic-skip" data-action="finish-intro">Passer</button>
    <div class="cinematic-dialogue">
      <p class="screen-kicker">${slide.kicker}</p>
      <h1>${slide.title}</h1>
      <p>${slide.copy}</p>
      <footer><span>${slide.speaker}</span><button class="primary-action" data-action="next-intro">${introSlide === slides.length - 1 ? 'Entrer dans l’Observatoire' : 'Continuer'} <i>›</i></button></footer>
      <div class="cinematic-progress">${slides.map((_, index) => `<i class="${index <= introSlide ? 'active' : ''}"></i>`).join('')}</div>
    </div>
  </section>`;
}

function renderTitle() {
  const c = campaign();
  content.innerHTML = `<section class="title-screen">
    <div class="title-stars"></div>
    <div class="title-crest"><i></i><b>✦</b><i></i></div>
    <p class="screen-kicker">AN ASTRAL GUARDIANS SAGA</p>
    <h1>Orbes <span>d’Astra</span></h1>
    <p>Campagne · Invocations · Boss · Défis</p>
    <button class="primary-action title-enter" data-action="${c.introSeen ? 'hub' : 'intro'}">${c.introSeen ? 'Reprendre l’aventure' : 'Commencer'}</button>
    ${c.introSeen ? '<button class="ghost-action" data-action="replay-intro">Revoir le prologue</button>' : ''}
  </section>`;
}

function renderHub() {
  const w = world();
  const c = campaign();
  const progress = progressSummary();
  const activeHero = heroById(w?.selected_hero_id) ?? w?.config.heroes[0];
  const next = ALL_MISSIONS.find((mission) => !c.completed[mission.id]) ?? ALL_MISSIONS.at(-1);
  const dailyAvailable = c.dailyGift !== todayKey();
  content.innerHTML = `<section class="hub-world">
    <div class="hub-sky"><div class="hub-cloud cloud-a"></div><div class="hub-cloud cloud-b"></div><div class="hub-orrery"></div></div>
    <header class="hub-header">
      <div><small>OBSERVATOIRE ASTRA</small><strong>Bienvenue, Invocateur</strong></div>
      <div class="hub-currencies"><span><b>${w?.currency ?? 0}</b> ✦</span><span><b>${w?.essence ?? 0}</b> ◈</span></div>
    </header>
    <div class="hub-hero-stage">
      <div class="hero-halo"></div>
      ${portraitHtml(activeHero, 'hub', 'is-breathing')}
      <div class="hero-caption"><small>${activeHero?.rarity} · ${activeHero?.faction ?? 'Gardien'}</small><h1>${activeHero?.name}</h1><p>${activeHero?.title}</p><q>${activeHero?.quote ?? ''}</q></div>
    </div>
    <div class="hub-content-rail">
      <button class="story-banner" data-action="campaign">
        <span class="story-progress" style="--progress:${progress.percent}%"><i></i><b>${progress.percent}%</b></span>
        <span><small>AVENTURE PRINCIPALE · ${next?.code ?? 'FIN'}</small><strong>${next?.name ?? 'Le ciel restauré'}</strong><em>${progress.completed}/18 missions · ${progress.stars}/54 étoiles</em></span>
        <b class="banner-arrow">›</b>
      </button>
      <div class="hub-event-row">
        <button class="event-banner event-banner--summon" data-action="sanctuaire"><small>INVOCATION LIMITÉE</small><strong>Danse de l’Aurore</strong><span>Solveig · SSR vedette</span><i>Invoquer</i></button>
        <button class="event-banner event-banner--raid" data-action="challenges"><small>RAID HEBDOMADAIRE</small><strong>Léviathan du Vide</strong><span>3 phases · récompenses rares</span><i>Combattre</i></button>
      </div>
      <div class="hub-utility-strip">
        <button data-action="reliquaire"><i>◈</i><span><strong>Reliquaire</strong><small>Équipement</small></span></button>
        <button data-action="minigames"><i>✧</i><span><strong>Festival astral</strong><small>2 mini-jeux</small></span></button>
        <button data-action="codex"><i>⌘</i><span><strong>Archives</strong><small>Univers & règles</small></span></button>
        <button data-action="claim-daily" class="${dailyAvailable ? 'has-reward' : ''}" ${dailyAvailable ? '' : 'disabled'}><i>✉</i><span><strong>Messagerie</strong><small>${dailyAvailable ? 'Cadeau disponible' : 'Revenez demain'}</small></span></button>
      </div>
    </div>
    ${dock('hub')}
  </section>`;
}

function renderCampaign() {
  const c = campaign();
  const progress = progressSummary();
  content.innerHTML = `<section class="campaign-screen">
    ${topbar('Carte céleste')}
    <div class="campaign-hero">
      <p class="screen-kicker">AVENTURE PRINCIPALE</p>
      <h1>La Route du Nexus</h1>
      <p>Trois royaumes, dix-huit missions et trois affrontements majeurs.</p>
      <div class="campaign-total"><span><b>${progress.completed}</b>/18 missions</span><span><b>${progress.stars}</b>/54 étoiles</span><span><b>${progress.percent}</b>% restauré</span></div>
    </div>
    <div class="chapter-stack">${CHAPTERS.map((chapter) => {
      const cleared = chapter.missions.filter((mission) => c.completed[mission.id]).length;
      return `<article class="chapter-card" style="--chapter-accent:${chapter.accent}">
        <header><span class="chapter-number">${chapter.number}</span><span><small>${chapter.realm}</small><h2>${chapter.title}</h2><p>${chapter.story}</p></span><b>${cleared}/6</b></header>
        <div class="constellation-path">${chapter.missions.map((mission, index) => {
          const unlocked = isMissionUnlocked(mission.id);
          const stars = Number(c.stars[mission.id] || 0);
          return `<button class="mission-node ${mission.boss ? 'boss' : ''} ${c.completed[mission.id] ? 'cleared' : ''} ${unlocked ? '' : 'locked'}" data-action="brief-mission" data-mission="${mission.id}" ${unlocked ? '' : 'disabled'}>
            <span>${unlocked ? (mission.boss ? '♜' : mission.code.split('-')[1]) : '◆'}</span><small>${mission.kind}</small><strong>${mission.name}</strong><em>${stars ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : unlocked ? objectiveFor(mission.rules) : 'Verrouillé'}</em>
          </button>${index < chapter.missions.length - 1 ? '<i class="path-link"></i>' : ''}`;
        }).join('')}</div>
      </article>`;
    }).join('')}</div>
    ${dock('campaign')}
  </section>`;
}

function renderMissionBrief(id) {
  const mission = missionById(id);
  if (!mission) return renderCampaign();
  const w = world();
  const activeHero = heroById(w?.selected_hero_id) ?? w?.config.heroes[0];
  const c = campaign();
  content.innerHTML = `<section class="mission-brief ${mission.boss ? 'is-boss' : ''}">
    ${topbar(mission.code, mission.id.startsWith('c') ? 'campaign' : 'challenges')}
    <div class="mission-keyart">
      <div class="mission-anomaly"></div>
      ${mission.boss ? '<div class="boss-silhouette"><i></i><b></b><i></i></div>' : portraitHtml(activeHero, 'mission', 'is-breathing')}
      <div class="mission-label"><small>${mission.kind.toUpperCase()}</small><h1>${mission.name}</h1><p>${objectiveFor(mission.rules)}</p></div>
    </div>
    <div class="briefing-panel">
      <div><small>OBJECTIF</small><strong>${objectiveFor(mission.rules)}</strong></div>
      ${mission.rules.time_limit_ms ? `<div><small>TEMPS LIMITE</small><strong>${Math.round(mission.rules.time_limit_ms / 1000)} secondes</strong></div>` : ''}
      ${mission.rules.boss_max_hp ? `<div><small>PUISSANCE DU BOSS</small><strong>${mission.rules.boss_max_hp.toLocaleString('fr-FR')} PV · 3 phases</strong></div>` : ''}
      <div><small>RÉCOMPENSE DE PREMIÈRE VICTOIRE</small><strong>✦ ${mission.rules.reward_currency ?? 0} · ◈ ${mission.rules.reward_essence ?? 0}</strong></div>
      <div class="briefing-squad"><small>GARDIEN ACTIF</small><button data-action="galerie">${portraitHtml(activeHero, 'xs')}<span><strong>${activeHero?.name}</strong><em>${activeHero?.ability_label}</em></span><b>Changer</b></button></div>
      <div class="mission-stars"><small>MEILLEUR RÉSULTAT</small><strong>${'★'.repeat(c.stars[id] || 0)}${'☆'.repeat(3 - (c.stars[id] || 0))}</strong></div>
      <button class="primary-action mission-launch" data-action="start-mission" data-mission="${id}">Lancer la mission</button>
    </div>
  </section>`;
}

function renderSanctuaryWallet() {
  const w = world();
  const wallet = content.querySelector('#sanctuary-wallet');
  if (wallet && w) wallet.innerHTML = `<span><b>${w.currency}</b> éclats</span><span><b>${w.pity}</b> / ${w.config.pity_after} vers SSR</span><span class="${w.featured_guaranteed ? 'guaranteed' : ''}">${w.featured_guaranteed ? 'SSR vedette garanti' : '50/50 vedette'}</span>`;
  for (const button of content.querySelectorAll('[data-action^="summon-"]')) {
    const count = button.dataset.action === 'summon-10' ? 10 : 1;
    const cost = count === 10 ? w?.config.summon10_cost : w?.config.summon_cost;
    button.disabled = summoning || !w || w.currency < cost;
  }
}

function summonCardHtml(result, index) {
  const hero = heroById(result.hero_id);
  const detail = result.duplicate
    ? (result.stars > 0 ? `Évolution ${'★'.repeat(result.stars)} · +${result.essence_gained} essence` : `Doublon · +${result.essence_gained} essence`)
    : `NOUVEAU · ${hero?.ability_label ?? ''}`;
  return `<article class="summon-card rar-${result.rarity.toLowerCase()} ${result.duplicate ? '' : 'is-new'} ${result.featured ? 'is-featured' : ''}" style="--delay:${index * 90}ms">
    <div class="summon-card-art">${portraitHtml(hero, 'summon')}<i></i></div>
    <div><small>${result.featured ? 'VEDETTE · ' : ''}${result.rarity}</small><h3>${hero?.name ?? result.hero_id}</h3><p>${hero?.title ?? ''}</p><em>${detail}</em></div>
  </article>`;
}

function renderSanctuary() {
  const w = world();
  const banner = BANNERS[activeBanner];
  const hero = banner.featured ? heroById(banner.featured) : heroById('aster');
  content.innerHTML = `<section class="sanctuary-screen" style="--banner-accent:${banner.accent}">
    ${topbar('Sanctuaire')}
    <div class="banner-tabs">${Object.values(BANNERS).map((entry) => `<button data-action="switch-banner" data-banner="${entry.id}" class="${entry.id === activeBanner ? 'active' : ''}">${entry.name}</button>`).join('')}</div>
    <div class="featured-banner">
      <div class="banner-cosmos"><i></i><i></i><i></i></div>
      <div class="banner-guardian">${portraitHtml(hero, 'banner', 'is-breathing')}</div>
      <div class="banner-copy"><small>${banner.eyebrow}</small><h1>${banner.name}</h1><p>${banner.copy}</p>${hero ? `<div class="banner-tags"><span>${hero.rarity}</span><span>${hero.element}</span><span>${hero.role}</span></div>` : ''}</div>
    </div>
    <div class="sanctuary-wallet" id="sanctuary-wallet"></div>
    <p class="summon-promise">SSR 5 % · SR 25 % · SSR garanti au plus tard à 30 · ×10 garantit SR ou mieux</p>
    <div class="summon-actions">
      <button data-action="summon-1"><small>Invocation</small><strong>1 fois</strong><span>✦ ${w?.config.summon_cost ?? 100}</span></button>
      <button class="primary" data-action="summon-10"><small>Invocation</small><strong>10 fois</strong><span>✦ ${w?.config.summon10_cost ?? 900}</span><em>SR+ GARANTI</em></button>
    </div>
    <div class="summon-results" id="summon-results"></div>
    ${dock('sanctuaire')}
  </section>`;
  renderSanctuaryWallet();
}

async function runSummon(count) {
  if (summoning || !engine) return;
  const w = world();
  const banner = BANNERS[activeBanner];
  const cost = count === 10 ? w.config.summon10_cost : w.config.summon_cost;
  if (w.currency < cost) return;
  summoning = true;
  playSfx('summon');
  renderSanctuaryWallet();
  const options = banner.featured ? { featured_hero_id: banner.featured } : {};
  const outcome = count === 10 ? engine.summonHeroTen(options) : engine.summonHero(options);
  const results = Array.isArray(outcome) ? outcome : outcome ? [outcome] : [];
  if (!results.length) { summoning = false; return; }
  const best = results.some((entry) => entry.rarity === 'SSR') ? 'SSR' : results.some((entry) => entry.rarity === 'SR') ? 'SR' : 'R';
  const cinematic = document.createElement('div');
  cinematic.className = `summon-cinematic rarity-${best.toLowerCase()}`;
  cinematic.innerHTML = `<div class="summon-rift"><i></i><i></i><i></i><b>✦</b></div><p>Les constellations répondent…</p>`;
  content.append(cinematic);
  await sleep(best === 'SSR' ? 2100 : 1500);
  playSfx(best === 'R' ? 'match' : 'rare');
  cinematic.classList.add('reveal');
  await sleep(500);
  cinematic.remove();
  const resultsBox = content.querySelector('#summon-results');
  if (resultsBox) {
    resultsBox.innerHTML = `<header><small>RÉSULTAT DE L’INVOCATION</small><strong>${best === 'SSR' ? 'Une légende a répondu !' : best === 'SR' ? 'Résonance rare détectée' : 'Nouveaux liens astraux'}</strong></header><div class="summon-grid">${results.map(summonCardHtml).join('')}</div>`;
    resultsBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  summoning = false;
  renderSanctuaryWallet();
}

function filteredHeroes() {
  const heroes = world()?.config.heroes ?? [];
  if (galleryFilter === 'Tous') return heroes;
  if (galleryFilter === 'Possédés') return heroes.filter((hero) => world().unlocked_hero_ids.includes(hero.id));
  if (RARITY_COLORS[galleryFilter]) return heroes.filter((hero) => hero.rarity === galleryFilter);
  return heroes.filter((hero) => hero.role === galleryFilter || hero.element === galleryFilter);
}

function guardianCard(hero) {
  const w = world();
  const owned = w.unlocked_hero_ids.includes(hero.id);
  const selected = w.selected_hero_id === hero.id;
  return `<button class="guardian-card rar-${hero.rarity.toLowerCase()} ${owned ? 'owned' : 'locked'} ${selected ? 'selected' : ''}" data-action="guardian-detail" data-hero="${hero.id}">
    <span class="guardian-art">${portraitHtml(hero, 'roster')}<i></i></span>
    <span class="guardian-rarity">${hero.rarity}</span>
    <span class="guardian-info"><strong>${owned ? hero.name : 'Silhouette inconnue'}</strong><small>${owned ? hero.role : 'À invoquer'}</small><em>${owned ? starBar(hero.id) : '◇◇◇◇◇'}</em></span>
    ${selected ? '<b class="active-mark">ACTIF</b>' : ''}
  </button>`;
}

function renderGallery() {
  const w = world();
  const roles = [...new Set(w?.config.heroes.map((hero) => hero.role).filter(Boolean) ?? [])].slice(0, 5);
  const filters = ['Tous', 'Possédés', 'SSR', 'SR', 'R', ...roles];
  const owned = w?.unlocked_hero_ids.length ?? 0;
  content.innerHTML = `<section class="gallery-screen">
    ${topbar('Gardiens')}
    <div class="gallery-heading"><div><p class="screen-kicker">ARCHIVES VIVANTES</p><h1>Les 24 Gardiens</h1><p>${owned}/24 recrutés · sélectionnez un portrait pour consulter son histoire et ses talents.</p></div><div class="essence-vault"><small>ESSENCE D’ÉVEIL</small><strong>${w?.essence ?? 0} ◈</strong></div></div>
    <div class="gallery-filters">${filters.map((filter) => `<button data-action="filter-gallery" data-filter="${filter}" class="${filter === galleryFilter ? 'active' : ''}">${filter}</button>`).join('')}</div>
    <div class="guardian-grid">${filteredHeroes().map(guardianCard).join('')}</div>
    ${dock('galerie')}
  </section>`;
}

function renderGuardianDetail(id) {
  const hero = heroById(id);
  const w = world();
  if (!hero || !w) return renderGallery();
  const owned = w.unlocked_hero_ids.includes(hero.id);
  const selected = w.selected_hero_id === hero.id;
  const stars = heroStars(hero.id);
  const level = w.hero_levels?.[hero.id] ?? 0;
  const cost = engine.awakenCost(hero.id);
  content.innerHTML = `<section class="guardian-detail rar-${hero.rarity.toLowerCase()}">
    ${topbar(hero.name, 'galerie')}
    <div class="guardian-detail-art"><div class="detail-constellation"></div>${portraitHtml(hero, 'detail', 'is-breathing')}<div class="detail-name"><small>${hero.rarity} · ${hero.faction}</small><h1>${owned ? hero.name : 'Gardien non recruté'}</h1><p>${hero.title}</p></div></div>
    <div class="guardian-sheet">
      <div class="guardian-tags"><span>${hero.element ?? 'Astral'}</span><span>${hero.role ?? 'Gardien'}</span><span>Éveil ${level}/${w.config.awaken_max_level}</span></div>
      <q>${owned ? hero.quote : 'Cette voix ne s’est pas encore liée à votre constellation.'}</q>
      <p>${owned ? hero.biography : 'Invoquez ce Gardien au Sanctuaire pour révéler son histoire, ses compétences et son ultime.'}</p>
      <div class="ultimate-card"><i>✦</i><span><small>ULTIME</small><strong>${hero.ability_label}</strong><em>Puissance +${level * 20}% par éveil</em></span></div>
      <h2>Constellation d’évolution</h2>
      <div class="evolution-stars">${Array.from({ length: 5 }, (_, index) => `<i class="${index < stars ? 'active' : ''}">★</i>`).join('')}</div>
      <div class="skill-tree">${hero.skills.map((skill) => `<article class="${stars >= skill.stars ? 'unlocked' : 'locked'}"><i>${stars >= skill.stars ? '✦' : '◆'}</i><span><small>${skill.stars}★ REQUIS</small><strong>${skill.name}</strong><p>${skill.description}</p></span></article>`).join('')}</div>
      <div class="guardian-actions">
        <button data-action="select-hero" data-hero="${hero.id}" ${!owned || selected ? 'disabled' : ''}>${selected ? 'Gardien actif' : owned ? 'Définir comme actif' : 'À invoquer'}</button>
        <button class="primary-action" data-action="awaken-hero" data-hero="${hero.id}" ${!owned || cost === null || w.essence < cost ? 'disabled' : ''}>${cost === null ? 'Éveil maximum' : `Éveiller · ${cost} ◈`}</button>
      </div>
    </div>
  </section>`;
}

function itemIcon(kind, item, owned = true) {
  return `<span class="item-icon ${kind}" style="--item-color:${owned ? (item?.color ?? '#94a3b8') : '#334155'}">${kind === 'relic' ? '◇' : '✧'}</span>`;
}

function renderReliquary() {
  const w = world();
  const entries = [
    ...w.config.relics.map((item) => ({ ...item, kind: 'relic', level: w.relic_levels[item.id] ?? 0, equipped: w.equipped_relic === item.id })),
    ...w.config.companions.map((item) => ({ ...item, kind: 'companion', level: w.companion_levels[item.id] ?? 0, equipped: w.equipped_companion === item.id })),
  ];
  content.innerHTML = `<section class="reliquary-screen">
    ${topbar('Reliquaire')}
    <div class="reliquary-hero"><div class="relic-orbit"><i></i><i></i><i></i><b>◇</b></div><p class="screen-kicker">ARSENAL CÉLESTE</p><h1>La Crypte des Fragments</h1><p>Équipez une relique et un compagnon pour transformer votre façon de jouer.</p></div>
    <div class="loadout-summary"><div><small>RELIQUE ACTIVE</small><strong>${itemById('relic', w.equipped_relic)?.name ?? 'Aucune'}</strong></div><div><small>COMPAGNON ACTIF</small><strong>${itemById('companion', w.equipped_companion)?.name ?? 'Aucun'}</strong></div></div>
    <div class="relic-summon-panel"><span><small>RÉSONANCE D’OBJET</small><strong>✦ ${w.currency} · pitié ${w.relic_pity}/${w.config.pity_after}</strong></span><button data-action="relic-summon-1">Invoquer · ${w.config.relic_summon_cost}</button><button class="primary-action" data-action="relic-summon-10">×10 · ${w.config.relic_summon10_cost}</button></div>
    <div id="relic-result" class="relic-result"></div>
    <div class="relic-inventory">${entries.map((item) => `<article class="rar-${item.rarity.toLowerCase()} ${item.level ? '' : 'locked'} ${item.equipped ? 'equipped' : ''}">
      ${itemIcon(item.kind, item, Boolean(item.level))}<span><small>${item.kind === 'relic' ? 'RELIQUE' : 'COMPAGNON'} · ${item.rarity}</small><strong>${item.level ? item.name : 'Fragment inconnu'}</strong><p>${item.level ? item.description : 'À découvrir par invocation'}</p><em>${item.level ? `Niveau ${item.level}` : 'Non obtenu'}</em></span>
      <button data-action="equip-${item.kind}" data-item="${item.id}" ${!item.level || item.equipped ? 'disabled' : ''}>${item.equipped ? 'Équipé' : 'Équiper'}</button>
    </article>`).join('')}</div>
    ${dock()}
  </section>`;
}

function relicResultHtml(result) {
  const item = itemById(result.kind, result.item_id);
  return `<article class="relic-reveal rar-${result.rarity.toLowerCase()}">${itemIcon(result.kind, item)}<span><small>${result.rarity} · ${result.kind === 'relic' ? 'RELIQUE' : 'COMPAGNON'}</small><strong>${item?.name}</strong><p>${item?.description}</p><em>${result.essence_gained ? `Niveau max · +${result.essence_gained} essence` : `Niveau ${result.level}`}</em></span></article>`;
}

async function runRelicSummon(count) {
  if (summoning) return;
  const w = world();
  const cost = count === 10 ? w.config.relic_summon10_cost : w.config.relic_summon_cost;
  if (w.currency < cost) return;
  summoning = true;
  const outcome = count === 10 ? engine.summonRelicTen() : engine.summonRelic();
  const results = Array.isArray(outcome) ? outcome : outcome ? [outcome] : [];
  await sleep(550);
  const box = content.querySelector('#relic-result');
  if (box) box.innerHTML = results.map(relicResultHtml).join('');
  summoning = false;
}

function renderChallenges() {
  const c = campaign();
  content.innerHTML = `<section class="challenge-screen">
    ${topbar('Défis & raids')}
    <div class="challenge-heading"><p class="screen-kicker">CONTENU RENOUVELABLE</p><h1>Au-delà de la campagne</h1><p>Affrontez des règles extrêmes, améliorez vos records et remportez des ressources d’invocation.</p></div>
    <div class="challenge-featured">${CHALLENGES.map((challenge) => `<button data-action="brief-mission" data-mission="${challenge.id}" class="challenge-card ${challenge.boss ? 'boss' : ''}">
      <i>${challenge.icon}</i><span><small>${challenge.kind.toUpperCase()}</small><strong>${challenge.name}</strong><p>${objectiveFor(challenge.rules)}</p><em>Meilleur : ${c.challengeBest[challenge.id]?.toLocaleString?.('fr-FR') ?? 0} pts</em></span><b>✦ ${challenge.rules.reward_currency}</b>
    </button>`).join('')}</div>
    <div class="minigame-promo"><header><span><small>FESTIVAL ASTRAL</small><h2>Mini-jeux des Gardiens</h2></span><button data-action="minigames">Tout voir ›</button></header><div><button data-action="start-memory"><i>✧</i><span><strong>Mémoires célestes</strong><small>Retrouvez les constellations jumelles</small></span></button><button data-action="start-alignment"><i>◎</i><span><strong>Alignement astral</strong><small>Synchronisez l’Observatoire</small></span></button></div></div>
    ${dock('challenges')}
  </section>`;
}

function renderMinigames() {
  const c = campaign();
  const claimedMemory = c.minigameClaims.memory === todayKey();
  const claimedAlignment = c.minigameClaims.alignment === todayKey();
  content.innerHTML = `<section class="minigames-screen">
    ${topbar('Festival astral', 'challenges')}
    <div class="festival-marquee"><span>✧</span><div><p class="screen-kicker">ÉVÉNEMENT PERMANENT</p><h1>Festival des Constellations</h1><p>Des activités courtes qui donnent vie aux Gardiens entre deux missions.</p></div><span>✦</span></div>
    <div class="minigame-list">
      <article class="minigame-entry memory-entry"><div class="mini-art"><i></i><i></i><b>✧</b></div><div><small>ARCADE TACTILE · 30 S</small><h2>Chasse aux runes</h2><p>Identifiez le Gardien demandé, maintenez votre combo et survivez aux permutations accélérées du roster.</p><div><span>Record : <b>${c.minigameBest.memory || 0} pts</b></span><span>${claimedMemory ? 'Récompense quotidienne obtenue' : '✦ 220 · ◈ 12'}</span></div><button class="primary-action" data-action="start-memory">Lancer la chasse</button></div></article>
      <article class="minigame-entry alignment-entry"><div class="mini-art"><i></i><i></i><b>◎</b></div><div><small>RYTHME · SURCHAUFFE</small><h2>Forge des comètes</h2><p>Enchaînez huit impulsions de plus en plus rapides. La cible rétrécit et le combo multiplie chaque frappe réussie.</p><div><span>Record : <b>${c.minigameBest.alignment || 0} pts</b></span><span>${claimedAlignment ? 'Récompense quotidienne obtenue' : '✦ 260 · ◈ 14'}</span></div><button class="primary-action" data-action="start-alignment">Allumer la forge</button></div></article>
    </div>
    ${dock('challenges')}
  </section>`;
}

function shuffle(values) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function startMemory() {
  clearInterval(memoryTimer);
  const unlocked = (world()?.config.heroes ?? []).filter((hero) => world().unlocked_hero_ids.includes(hero.id));
  const pool = [...unlocked, ...(world()?.config.heroes ?? [])]
    .filter((hero, index, all) => all.findIndex((entry) => entry.id === hero.id) === index)
    .slice(0, 12);
  const cards = shuffle(pool.map((hero, index) => ({ key: `${hero.id}-${index}`, hero })));
  memoryGame = {
    cards,
    targetId: cards[Math.floor(Math.random() * cards.length)]?.hero.id,
    score: 0,
    combo: 0,
    hits: 0,
    mistakes: 0,
    startedAt: performance.now(),
    durationMs: 30_000,
    done: false,
    reward: null,
  };
  showMenu('memory');
  memoryTimer = window.setInterval(() => {
    if (!memoryGame || memoryGame.done || currentScreen !== 'memory') return;
    const remaining = Math.max(0, memoryGame.durationMs - (performance.now() - memoryGame.startedAt));
    const timer = content.querySelector('#rune-timer');
    const progress = content.querySelector('#rune-time-progress');
    if (timer) timer.textContent = (remaining / 1000).toFixed(1);
    if (progress) progress.style.setProperty('--progress', `${(remaining / memoryGame.durationMs) * 100}%`);
    if (remaining <= 0) finishRuneRush();
  }, 80);
}

function renderMemory() {
  const game = memoryGame;
  if (!game) return startMemory();
  const target = game.cards.find((card) => card.hero.id === game.targetId)?.hero;
  const remaining = Math.max(0, game.durationMs - (performance.now() - game.startedAt));
  content.innerHTML = `<section class="memory-screen">
    ${topbar('Chasse aux runes', 'minigames')}
    <div class="minigame-hud rune-hud"><span><small>SCORE</small><strong>${game.score}</strong></span><div><p>Trouvez <b>${target?.name ?? 'le Gardien'}</b> avant la rupture.</p><i id="rune-time-progress" style="--progress:${(remaining / game.durationMs) * 100}%"></i></div><span><small>TEMPS</small><strong id="rune-timer">${(remaining / 1000).toFixed(1)}</strong></span></div>
    <div class="rune-combo"><span>COMBO <b>×${Math.max(1, game.combo)}</b></span><span>${game.hits}/20 RUNES</span><span>${game.mistakes} ERREURS</span></div>
    <div class="memory-board">${game.cards.map((card, index) => {
      return `<button data-action="memory-card" data-index="${index}" class="memory-card rune-card" ${game.done ? 'disabled' : ''}><span class="card-front">${portraitHtml(card.hero, 'memory')}<strong>${card.hero.name}</strong></span></button>`;
    }).join('')}</div>
    ${game.done ? `<div class="minigame-result"><small>CONVERGENCE TERMINÉE</small><h2>${game.score} points</h2><p>${game.reward ? `Récompense : ✦ ${game.reward.currency} · ◈ ${game.reward.essence}` : 'Récompense quotidienne déjà obtenue — record sauvegardé.'}</p><button class="primary-action" data-action="start-memory">Relancer la chasse</button><button data-action="minigames">Retour au festival</button></div>` : ''}
  </section>`;
}

function finishRuneRush() {
  if (!memoryGame || memoryGame.done) return;
  clearInterval(memoryTimer);
  memoryGame.done = true;
  memoryGame.reward = finishMinigame('memory', memoryGame.score, { currency: 220, essence: 12 });
  renderMemory();
}

function finishMinigame(id, score, reward) {
  const c = campaign();
  const alreadyClaimed = c.minigameClaims[id] === todayKey();
  const currentBest = Number(c.minigameBest[id] || 0);
  const better = score > currentBest;
  const next = {
    ...c,
    minigameBest: { ...c.minigameBest, [id]: better ? score : currentBest },
    minigameClaims: { ...c.minigameClaims, ...(alreadyClaimed ? {} : { [id]: todayKey() }) },
  };
  saveCampaign(next);
  if (!alreadyClaimed) engine.grantRewards(reward.currency, reward.essence);
  return alreadyClaimed ? null : reward;
}

async function flipMemoryCard(index) {
  if (memoryLocked || !memoryGame || memoryGame.done) return;
  const card = memoryGame.cards[index];
  if (!card) return;
  if (card.hero.id === memoryGame.targetId) {
    playSfx('match');
    memoryGame.combo += 1;
    memoryGame.hits += 1;
    memoryGame.score += 100 + Math.min(500, (memoryGame.combo - 1) * 35);
    memoryGame.cards = shuffle(memoryGame.cards);
    const choices = memoryGame.cards.filter((entry) => entry.hero.id !== card.hero.id);
    memoryGame.targetId = choices[Math.floor(Math.random() * choices.length)]?.hero.id ?? memoryGame.cards[0]?.hero.id;
  } else {
    playSfx('tap');
    memoryGame.combo = 0;
    memoryGame.mistakes += 1;
    memoryGame.score = Math.max(0, memoryGame.score - 40);
  }
  if (memoryGame.hits >= 20) return finishRuneRush();
  renderMemory();
}

function startAlignment() {
  alignmentGame = { round: 0, score: 0, combo: 0, perfects: 0, target: 24 + Math.random() * 52, targetWidth: 15, startedAt: performance.now(), lastPoints: null, done: false, reward: null };
  showMenu('alignment');
}

function alignmentPosition(now = performance.now()) {
  if (!alignmentGame) return 0;
  const speed = Math.max(250, 570 - alignmentGame.round * 34);
  const elapsed = now - alignmentGame.startedAt;
  return 50 + Math.sin(elapsed / speed) * 43 + Math.sin(elapsed / (speed * 0.47)) * 3;
}

function animateAlignment() {
  cancelAnimationFrame(alignmentFrame);
  const tick = (now) => {
    if (currentScreen !== 'alignment' || !alignmentGame || alignmentGame.done) return;
    const needle = content.querySelector('#alignment-needle');
    if (needle) needle.style.left = `${alignmentPosition(now)}%`;
    alignmentFrame = requestAnimationFrame(tick);
  };
  alignmentFrame = requestAnimationFrame(tick);
}

function renderAlignment() {
  const game = alignmentGame;
  if (!game) return startAlignment();
  content.innerHTML = `<section class="alignment-screen">
    ${topbar('Alignement astral', 'minigames')}
    <div class="alignment-chamber">
      <div class="alignment-rings ${game.done ? 'stabilized' : ''}"><i></i><i></i><i></i><b>✦</b></div>
      <p class="screen-kicker">FORGE RYTHMIQUE ${Math.min(8, game.round + 1)}/8</p><h1>${game.done ? 'Comète forgée' : 'Frappez au cœur de l’impulsion'}</h1>
      <div class="alignment-score"><span>Score</span><strong>${game.score}</strong><span>Combo ×${Math.max(1, game.combo)}</span></div>
      <div class="alignment-track"><div class="alignment-target" style="left:${game.target - game.targetWidth / 2}%;width:${game.targetWidth}%"></div><i id="alignment-needle"></i></div>
      ${game.lastPoints !== null ? `<p class="alignment-feedback ${game.lastPoints >= 100 ? 'perfect' : ''}">+${game.lastPoints} · ${game.lastPoints >= 100 ? 'PARFAIT' : game.lastPoints >= 60 ? 'RÉSONANCE' : 'INSTABLE'}</p>` : '<p class="alignment-feedback">La zone se déplace après chaque frappe.</p>'}
      ${game.done ? `<div class="minigame-result"><small>SCORE FINAL</small><h2>${game.score} points</h2><p>${game.reward ? `Récompense : ✦ ${game.reward.currency} · ◈ ${game.reward.essence}` : 'Récompense quotidienne déjà obtenue — record sauvegardé.'}</p><button class="primary-action" data-action="start-alignment">Rejouer</button><button data-action="minigames">Retour au festival</button></div>` : '<button class="primary-action alignment-hit" data-action="alignment-hit">STABILISER</button>'}
    </div>
  </section>`;
  if (!game.done) animateAlignment();
}

function hitAlignment() {
  if (!alignmentGame || alignmentGame.done) return;
  const position = alignmentPosition();
  const distance = Math.abs(position - alignmentGame.target);
  const points = distance <= alignmentGame.targetWidth * 0.18 ? 120 : distance <= alignmentGame.targetWidth * 0.5 ? 70 : distance <= alignmentGame.targetWidth ? 25 : 0;
  playSfx(points >= 100 ? 'perfect' : points >= 60 ? 'match' : 'tap');
  if (points > 0) alignmentGame.combo += 1;
  else alignmentGame.combo = 0;
  if (points >= 100) alignmentGame.perfects += 1;
  alignmentGame.score += points * Math.max(1, alignmentGame.combo);
  alignmentGame.lastPoints = points;
  alignmentGame.round += 1;
  if (alignmentGame.round >= 8) {
    alignmentGame.done = true;
    alignmentGame.reward = finishMinigame('alignment', alignmentGame.score, { currency: 260, essence: 14 });
  } else {
    alignmentGame.target = 20 + Math.random() * 60;
    alignmentGame.targetWidth = Math.max(6, 15 - alignmentGame.round * 1.1);
    alignmentGame.startedAt = performance.now();
  }
  renderAlignment();
}

function renderCodex() {
  content.innerHTML = `<section class="codex-screen">
    ${topbar('Archives du Nexus')}
    <div class="codex-heading"><p class="screen-kicker">BIBLIOTHÈQUE CÉLESTE</p><h1>Comprendre Astra</h1><p>Univers, systèmes et économie sont réunis ici.</p></div>
    <div class="lore-chapters">
      <details open><summary><i>✦</i><span><small>JOUABILITÉ</small><strong>La Loi de la Réunion</strong></span><b>+</b></summary><div><p>Deux Astres identiques fusionnent vers un rang supérieur : Pio → Lumi → Séla → Kori → Hélio → Auriel → Gaïa → Astra.</p><p>Les cascades multiplient le score. L’ultime du Gardien actif se charge à chaque fusion et se déclenche avec la barre pleine.</p></div></details>
      <details><summary><i>♜</i><span><small>CAMPAGNE</small><strong>Missions, dangers et boss</strong></span><b>+</b></summary><div><p>Les missions alternent objectifs de rang, score, survie et chronomètre. Les boss possèdent trois phases et attaquent le plateau avec gravité accrue, graines du vide et bris d’astres.</p></div></details>
      <details><summary><i>☼</i><span><small>INVOCATION</small><strong>Taux et garantie vedette</strong></span><b>+</b></summary><div><p>R 70 %, SR 25 %, SSR 5 %. Un SSR arrive au plus tard au 30e tirage. Sur bannière limitée, un SSR hors vedette garantit la vedette au prochain SSR. Une invocation ×10 garantit SR ou mieux.</p><p>Les doublons donnent une étoile d’évolution et de l’essence. Aucune monnaie payante : tout se gagne dans les missions, défis et mini-jeux.</p></div></details>
      <details><summary><i>☽</i><span><small>GARDIENS</small><strong>Évolution, éveil et loadout</strong></span><b>+</b></summary><div><p>1★ et 3★ débloquent des passifs ; 5★ donne la transcendance. L’essence renforce l’ultime. Une relique et un compagnon complètent le Gardien actif.</p></div></details>
      <details><summary><i>◈</i><span><small>CHRONIQUE</small><strong>La Nuit sans constellation</strong></span><b>+</b></summary><div><p>Quand Abyssion dévora le chant du Nexus, les étoiles se replièrent en Astres incarnés. L’Observatoire fut bâti sur la dernière vibration du monde. Ses vingt-quatre Gardiens sont les voix nécessaires pour recomposer le ciel.</p></div></details>
    </div>
    ${dock()}
  </section>`;
}

function runStars(detail, mission) {
  if (!detail.victory) return 0;
  let stars = 1;
  const benchmark = mission.rules.target_score || Math.max(700, mission.rules.boss_max_hp || 800);
  if (detail.score >= benchmark * 1.15) stars += 1;
  if ((mission.rules.time_limit_ms && detail.timeRemainingMs >= mission.rules.time_limit_ms * 0.2) || (!mission.rules.time_limit_ms && detail.score >= benchmark * 1.7)) stars += 1;
  return Math.min(3, stars);
}

function recordRunResult(detail) {
  const mission = missionById(detail.missionId);
  if (!mission) return;
  const c = campaign();
  const stars = runStars(detail, mission);
  if (ALL_MISSIONS.some((entry) => entry.id === mission.id)) {
    saveCampaign({
      ...c,
      completed: { ...c.completed, ...(detail.victory ? { [mission.id]: true } : {}) },
      stars: { ...c.stars, [mission.id]: Math.max(stars, Number(c.stars[mission.id] || 0)) },
    });
  } else {
    saveCampaign({ ...c, challengeBest: { ...c.challengeBest, [mission.id]: Math.max(detail.score, Number(c.challengeBest[mission.id] || 0)) } });
  }
  pendingResult = { ...detail, stars, mission };
}

function renderResult() {
  const result = pendingResult;
  if (!result) return renderHub();
  const nextIndex = missionIndex(result.mission.id) + 1;
  const next = nextIndex > 0 ? ALL_MISSIONS[nextIndex] : null;
  content.innerHTML = `<section class="result-screen ${result.victory ? 'victory' : 'defeat'}">
    <div class="result-rays"><i></i><i></i><i></i></div>
    <p class="screen-kicker">${result.victory ? 'MISSION ACCOMPLIE' : 'LA FAILLE RÉSISTE'}</p>
    <h1>${result.mission.name}</h1>
    <div class="result-emblem">${result.victory ? '✦' : '◆'}</div>
    <div class="result-stars">${result.victory ? '★'.repeat(result.stars) + '☆'.repeat(3 - result.stars) : '☆☆☆'}</div>
    <div class="result-stats"><div><small>SCORE</small><strong>${result.score.toLocaleString('fr-FR')}</strong></div><div><small>MEILLEUR ASTRE</small><strong>Rang ${result.bestTier + 1}</strong></div><div><small>TEMPS</small><strong>${Math.round(result.elapsedMs / 1000)} s</strong></div></div>
    <div class="result-loot"><span><i>✦</i><b>${result.victory ? result.mission.rules.reward_currency ?? 0 : 0}</b><small>Éclats</small></span><span><i>◈</i><b>${result.victory ? result.mission.rules.reward_essence ?? 0 : 0}</b><small>Essence</small></span></div>
    <div class="result-actions"><button data-action="start-mission" data-mission="${result.mission.id}">${result.victory ? 'Rejouer' : 'Réessayer'}</button>${result.victory && next ? `<button class="primary-action" data-action="brief-mission" data-mission="${next.id}">Mission suivante</button>` : ''}<button data-action="${result.mission.id.startsWith('c') ? 'campaign' : 'challenges'}">Retour</button></div>
  </section>`;
}

function renderStageBriefing(mission) {
  const activeHero = heroById(world()?.selected_hero_id) ?? world()?.config.heroes[0];
  missionTitle.textContent = mission.name;
  missionObjective.textContent = objectiveFor(mission.rules);
  missionReward.innerHTML = `<span><small>RÉCOMPENSE</small><b>✦ ${mission.rules.reward_currency ?? 0}</b></span><span><small>ESSENCE</small><b>◈ ${mission.rules.reward_essence ?? 0}</b></span>`;
  stageSquad.innerHTML = `${portraitHtml(activeHero, 'stage-model', 'is-breathing')}<span><small>GARDIEN ACTIF</small><strong>${activeHero?.name}</strong><em>${activeHero?.ability_label}</em><b>100 charge : ULTIME</b><b>200 charge : SURPUISSANCE</b></span>`;
}

function launchMission(id) {
  const mission = missionById(id);
  if (!mission || (mission.id.startsWith('c') && !isMissionUnlocked(id))) return;
  clearTimeout(resultTimer);
  pendingResult = null;
  currentRun = mission;
  playSfx('launch');
  renderStageBriefing(mission);
  menu.hidden = true;
  stage.hidden = false;
  window.scrollTo(0, 0);
  engine.startMission({ id: mission.id, name: mission.name, ...mission.rules });
}

function claimDaily() {
  const c = campaign();
  if (c.dailyGift === todayKey()) return;
  engine.grantRewards(200, 10);
  patchCampaign({ dailyGift: todayKey() });
  showToast('Cadeau reçu · 200 éclats et 10 essence');
  renderHub();
}

function showToast(message) {
  document.querySelector('.global-toast')?.remove();
  const toast = document.createElement('div');
  toast.className = 'global-toast';
  toast.textContent = message;
  document.body.append(toast);
  setTimeout(() => toast.remove(), 2600);
}

function stopInteractiveLoops() {
  cancelAnimationFrame(alignmentFrame);
  alignmentFrame = 0;
  clearInterval(memoryTimer);
}

function showMenu(screen, payload) {
  clearTimeout(resultTimer);
  stopInteractiveLoops();
  engine?.saveProgress();
  engine?.setPaused(true);
  stage.hidden = true;
  menu.hidden = false;
  currentScreen = screen;
  menu.dataset.screen = screen;
  window.scrollTo(0, 0);
  menu.scrollTop = 0;
  content.style.animation = 'none';
  void content.offsetWidth;
  content.style.animation = '';
  if (screen === 'intro') renderIntro();
  else if (screen === 'title') renderTitle();
  else if (screen === 'hub') renderHub();
  else if (screen === 'campaign') renderCampaign();
  else if (screen === 'mission') renderMissionBrief(payload);
  else if (screen === 'sanctuaire') renderSanctuary();
  else if (screen === 'galerie') renderGallery();
  else if (screen === 'guardian') renderGuardianDetail(payload);
  else if (screen === 'reliquaire') renderReliquary();
  else if (screen === 'challenges') renderChallenges();
  else if (screen === 'minigames') renderMinigames();
  else if (screen === 'memory') renderMemory();
  else if (screen === 'alignment') renderAlignment();
  else if (screen === 'result') renderResult();
  else renderCodex();
}

content.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  const action = target?.dataset.action;
  if (!action || target.disabled) return;
  if (action === 'intro' || action === 'replay-intro') { introSlide = 0; showMenu('intro'); }
  else if (action === 'next-intro') {
    if (introSlide >= 3) { patchCampaign({ introSeen: true }); showMenu('hub'); }
    else { introSlide += 1; renderIntro(); }
  }
  else if (action === 'finish-intro') { patchCampaign({ introSeen: true }); showMenu('hub'); }
  else if (action === 'brief-mission') showMenu('mission', target.dataset.mission);
  else if (action === 'start-mission') launchMission(target.dataset.mission);
  else if (action === 'switch-banner') { activeBanner = target.dataset.banner; renderSanctuary(); }
  else if (action === 'summon-1') runSummon(1);
  else if (action === 'summon-10') runSummon(10);
  else if (action === 'filter-gallery') { galleryFilter = target.dataset.filter; renderGallery(); }
  else if (action === 'guardian-detail') showMenu('guardian', target.dataset.hero);
  else if (action === 'select-hero') { if (engine.selectHero(target.dataset.hero)) renderGuardianDetail(target.dataset.hero); }
  else if (action === 'awaken-hero') { if (engine.awakenHero(target.dataset.hero)) renderGuardianDetail(target.dataset.hero); }
  else if (action === 'relic-summon-1') runRelicSummon(1);
  else if (action === 'relic-summon-10') runRelicSummon(10);
  else if (action === 'equip-relic') { if (engine.equipRelic(target.dataset.item)) renderReliquary(); }
  else if (action === 'equip-companion') { if (engine.equipCompanion(target.dataset.item)) renderReliquary(); }
  else if (action === 'start-memory') startMemory();
  else if (action === 'memory-card') flipMemoryCard(Number(target.dataset.index));
  else if (action === 'start-alignment') startAlignment();
  else if (action === 'alignment-hit') hitAlignment();
  else if (action === 'claim-daily') claimDaily();
  else showMenu(action);
});

content.addEventListener('pointermove', (event) => {
  if (currentScreen !== 'hub') return;
  const root = content.querySelector('.hub-world');
  if (!root) return;
  const rect = root.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 18;
  const y = ((event.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 10;
  root.style.setProperty('--parallax-x', `${x.toFixed(2)}px`);
  root.style.setProperty('--parallax-y', `${y.toFixed(2)}px`);
  root.style.setProperty('--parallax-bg-x', `${(-x * 0.3).toFixed(2)}px`);
  root.style.setProperty('--parallax-bg-y', `${(-y * 0.3).toFixed(2)}px`);
});

window.addEventListener(OPEN_SUMMON_EVENT, () => showMenu('sanctuaire'));
window.addEventListener(OPEN_RELIQUARY_EVENT, () => showMenu('reliquaire'));
window.addEventListener(OPEN_GALLERY_EVENT, () => showMenu('galerie'));
window.addEventListener(RUN_RESULT_EVENT, (event) => {
  const detail = event.detail;
  if (!detail || !missionById(detail.missionId)) return;
  engine.setPaused(true);
  recordRunResult(detail);
  clearTimeout(resultTimer);
  resultTimer = setTimeout(() => showMenu('result'), 950);
});
window.addEventListener(ABILITY_CAST_EVENT, (event) => {
  const detail = event.detail || {};
  const frame = Math.max(0, Number(detail.portraitFrame) || 0);
  superOverlay.style.setProperty('--super-color', detail.color || '#a78bfa');
  superOverlay.querySelector('.super-overlay__portrait').style.backgroundImage = `url('./assets/guardians/guardian-${String(frame).padStart(2, '0')}.png')`;
  superHeroName.textContent = detail.heroName || 'Gardien';
  superAbilityName.textContent = detail.overdrive ? `${detail.abilityName || 'Magie astrale'} · SURPUISSANCE` : (detail.abilityName || 'Magie astrale');
  superOverlay.classList.remove('is-active', 'is-overdrive');
  void superOverlay.offsetWidth;
  superOverlay.classList.add('is-active');
  if (detail.overdrive) superOverlay.classList.add('is-overdrive');
  window.setTimeout(() => superOverlay.classList.remove('is-active', 'is-overdrive'), detail.overdrive ? 2800 : 2200);
});

hubButton.addEventListener('click', () => showMenu('hub'));
restartButton.addEventListener('click', () => {
  if (currentRun) launchMission(currentRun.id);
});
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !stage.hidden) showMenu('hub');
});
window.addEventListener('pagehide', () => engine?.saveProgress());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') engine?.saveProgress();
});

async function start() {
  const response = await fetch('./game.gdl.json');
  if (!response.ok) throw new Error(`GDL introuvable (${response.status})`);
  gdl = await response.json();
  const [width, height] = gdl.meta?.resolution ?? [720, 1280];
  engine = new MergeDropEngine();
  await engine.init({ container: mount, width, height });
  await engine.loadGDL(gdl);
  engine.setPaused(true);
  for (const starter of world().config.initial_unlocked_heroes) {
    if (!world().unlocked_hero_ids.includes(starter)) world().unlocked_hero_ids.push(starter);
  }
  if (world().currency < world().config.summon10_cost) engine.grantRewards(world().config.summon10_cost - world().currency, 0);
  engine.saveProgress();
  status.textContent = '';
  window.orbesAstra = { engine, gdl, chapters: CHAPTERS, challenges: CHALLENGES, showMenu, launchMission };
  showMenu(campaign().introSeen ? 'hub' : 'intro');
}

start().catch((error) => {
  status.textContent = `Erreur : ${error instanceof Error ? error.message : String(error)}`;
});
