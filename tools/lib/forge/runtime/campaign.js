/**
 * CAMPAGNE — la structure d'un JEU COMPLET, pure et testable en Node :
 * enchaînement des niveaux, carte-monde, reliques, histoire, sauvegarde.
 *
 * Écrans : title → intro (histoire) → map → level → interlude (récit +
 * choix de relique) → map → … → outro (victoire finale).
 * La sauvegarde est injectable (localStorage au runtime, mémoire en test).
 */

export function createCampaign(gdl, storage = null) {
  const key = `forge-save-${gdl.id}`;
  const saved = storage ? safeParse(storage.getItem(key)) : null;
  return {
    gdl, key, storage,
    screen: 'title',
    levelIndex: saved?.levelIndex ?? 0,
    unlocked: saved?.unlocked ?? 1, // nb de niveaux accessibles
    relics: saved?.relics ?? [], // ids de reliques acquises
    totalScore: saved?.totalScore ?? 0,
    completed: saved?.completed ?? [], // ids de niveaux finis
    pendingRelicChoice: null, // [relicA, relicB] proposées à l'intermède
    storyQueue: [], storyIndex: 0, // dialogues en cours
  };
}

function safeParse(s) { try { return JSON.parse(s); } catch { return null; } }

export function saveCampaign(c) {
  if (!c.storage) return;
  c.storage.setItem(c.key, JSON.stringify({
    levelIndex: c.levelIndex, unlocked: c.unlocked, relics: c.relics,
    totalScore: c.totalScore, completed: c.completed,
  }));
}

/** Modificateurs cumulés des reliques acquises → stats héros. */
export function relicModifiers(c) {
  const mods = { speedMul: 1, jumpMul: 1, damageAdd: 0, hpAdd: 0 };
  for (const id of c.relics) {
    const r = (c.gdl.relics ?? []).find((x) => x.id === id);
    if (!r?.effect) continue;
    if (r.effect.speedMul) mods.speedMul *= r.effect.speedMul;
    if (r.effect.jumpMul) mods.jumpMul *= r.effect.jumpMul;
    if (r.effect.damageAdd) mods.damageAdd += r.effect.damageAdd;
    if (r.effect.hpAdd) mods.hpAdd += r.effect.hpAdd;
  }
  return mods;
}

/** Dialogues d'un moment donné : 'intro' | 'outro' | victoire d'un niveau. */
export function storyBeats(gdl, moment, levelId = null) {
  const story = gdl.story ?? {};
  if (moment === 'intro') return story.intro ?? [];
  if (moment === 'outro') return story.outro ?? [];
  if (moment === 'level_victory') return story.levels?.[levelId]?.victory ?? [];
  return [];
}

// ── transitions d'écrans ──

export function startGame(c) {
  const intro = storyBeats(c.gdl, 'intro');
  if (intro.length && c.completed.length === 0) { c.screen = 'intro'; c.storyQueue = intro; c.storyIndex = 0; }
  else c.screen = 'hub';
}

export function advanceStory(c) {
  c.storyIndex++;
  if (c.storyIndex < c.storyQueue.length) return;
  // fin des dialogues → écran suivant selon le contexte
  if (c.screen === 'intro') c.screen = 'hub';
  else if (c.screen === 'interlude') {
    c.screen = c.pendingRelicChoice ? 'relic' : afterInterlude(c);
  } else if (c.screen === 'outro') c.screen = 'credits';
  c.storyQueue = []; c.storyIndex = 0;
}

function afterInterlude(c) {
  return c.completed.length >= c.gdl.levels.length ? 'outro-start' : 'hub';
}

export function selectLevel(c, index) {
  if (index >= c.unlocked || index >= c.gdl.levels.length) return false;
  c.levelIndex = index;
  c.screen = 'level';
  return true;
}

/** Le niveau est gagné → histoire, relique, déverrouillage, sauvegarde. */
export function onLevelWon(c, score) {
  const level = c.gdl.levels[c.levelIndex];
  c.totalScore += score;
  if (!c.completed.includes(level.id)) c.completed.push(level.id);
  c.unlocked = Math.max(c.unlocked, Math.min(c.levelIndex + 2, c.gdl.levels.length));

  // relique proposée : 2 non possédées au choix
  const owned = new Set(c.relics);
  const available = (c.gdl.relics ?? []).filter((r) => !owned.has(r.id));
  c.pendingRelicChoice = available.length ? available.slice(0, 2) : null;

  const beats = storyBeats(c.gdl, 'level_victory', level.id);
  const isLast = c.completed.length >= c.gdl.levels.length;
  if (beats.length) { c.screen = 'interlude'; c.storyQueue = beats; c.storyIndex = 0; }
  else if (c.pendingRelicChoice) c.screen = 'relic';
  else c.screen = isLast ? 'outro-start' : 'map';
  saveCampaign(c);
}

export function chooseRelic(c, relicId) {
  if (c.pendingRelicChoice?.some((r) => r.id === relicId)) c.relics.push(relicId);
  c.pendingRelicChoice = null;
  saveCampaign(c);
  if (c.completed.length >= c.gdl.levels.length) c.screen = 'outro-start';
  else c.screen = 'hub';
}

export function returnToHub(c) {
  c.screen = 'hub';
  c.storyQueue = [];
  c.storyIndex = 0;
  saveCampaign(c);
}

/** À appeler quand screen === 'outro-start' : lance les dialogues de fin. */
export function startOutro(c) {
  const beats = storyBeats(c.gdl, 'outro');
  if (beats.length) { c.screen = 'outro'; c.storyQueue = beats; c.storyIndex = 0; }
  else c.screen = 'credits';
}

export function resetCampaign(c) {
  c.levelIndex = 0; c.unlocked = 1; c.relics = []; c.totalScore = 0; c.completed = [];
  c.screen = 'title'; c.pendingRelicChoice = null; c.storyQueue = [];
  saveCampaign(c);
}
