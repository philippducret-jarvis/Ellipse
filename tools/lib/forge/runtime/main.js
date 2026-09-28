/**
 * BOOT v2 — jeu COMPLET : titre → histoire → carte-monde → niveaux enchaînés
 * (reliques, boss) → fin. Sauvegarde locale. Panneau « Modifier par prompt »
 * (POST /iterate, servi par forge:serve ou l'orchestrateur).
 * Copié tel quel dans chaque workspace : générique, piloté par le GDL.
 */
import { createGame, step } from './logic.js';
import {
  render, createFx, fxFromEvents, setLevelToast,
  renderTitle, renderStoryBackdrop, renderHub, renderMap, renderCollection, renderCodex,
  renderDialogue, renderRelicChoice, renderCredits, renderPause, renderDefeat,
} from './render.js';
import {
  createCampaign, startGame, advanceStory, selectLevel, onLevelWon,
  chooseRelic, relicModifiers, startOutro, resetCampaign, returnToHub,
} from './campaign.js';
import { createAudio } from './audio.js';

const loadJson = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(`${u}: HTTP ${r.status}`); return r.json(); });
const loadImage = (u) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error(`image: ${u}`)); i.src = u; });
const tryImage = (u) => loadImage(u).catch(() => null);

async function loadRigPack(rigPath) {
  const rig = await loadJson(rigPath);
  const dir = rigPath.split('/').slice(0, -1).join('/');
  // rendu marionnette : l'illustration COMPLÈTE détourée (rig.source)
  const full = await loadImage(`${dir}/${rig.source}`);
  return { rig, full };
}

async function loadArena(path) {
  const parallax = await loadJson(path);
  const dir = path.split('/').slice(0, -1).join('/');
  const layers = await Promise.all(parallax.layers.map(async (l) => ({ ...l, img: await tryImage(`${dir}/${l.file}`) })));
  return { layers };
}

async function boot() {
  const gdl = await loadJson('game.gdl.json');
  const vp = gdl.world.viewport;
  const canvas = document.getElementById('game');
  canvas.width = vp.w; canvas.height = vp.h;
  const ctx = canvas.getContext('2d');
  document.title = gdl.title;
  const titleEl = document.getElementById('game-title');
  if (titleEl) titleEl.textContent = `${gdl.title} — Forge Ellipse`;

  // ── assets : arènes uniques + rigs + portrait héros ──
  const arenaPaths = [...new Set(gdl.levels.map((l) => l.arena))];
  const arenas = {};
  await Promise.all(arenaPaths.map(async (p) => { arenas[p] = await loadArena(p); }));
  const rigs = {};
  await Promise.all(Object.entries(gdl.entities).map(async ([kind, e]) => { rigs[kind] = await loadRigPack(e.rig); }));
  const heroPortrait = await tryImage('assets/hero/hero.portrait.png');
  const accent = gdl.ui?.accent ?? '#e8c05a';

  // ── campagne + effets + audio ──
  const campaign = createCampaign(gdl, window.localStorage);
  const fx = createFx();
  const audio = createAudio(gdl);
  let hitstop = 0; // game feel : micro-gel du temps sur les impacts forts
  let game = null;
  let hubSel = 0;
  let mapSel = Math.min(campaign.unlocked - 1, gdl.levels.length - 1);
  let relicSel = 0;
  let dialogueT = 0;
  let screenT = 0;
  let lastResult = { score: 0, deaths: 0 };

  const bossKind = Object.entries(gdl.entities).find(([, e]) => e.role === 'boss')?.[0];

  function startLevel(index) {
    if (!selectLevel(campaign, index)) return;
    game = createGame(gdl, index, { modifiers: relicModifiers(campaign) });
    game.relics = campaign.relics.map((id) => (gdl.relics ?? []).find((r) => r.id === id)).filter(Boolean);
    game.bossName = bossKind ? (gdl.entities[bossKind].name ?? 'Boss') : 'Boss';
    const node = gdl.map?.nodes?.[index];
    setLevelToast(fx, node?.name ?? gdl.levels[index].name ?? `Niveau ${index + 1}`);
  }

  // ── input ──
  const input = { left: false, right: false, jump: false, attack: false, dodge: false, ability: false, laneLeft: false, laneRight: false };
  const KEYS = {
    ArrowLeft: ['left', 'laneLeft'], KeyA: ['left', 'laneLeft'], KeyQ: ['left', 'laneLeft'],
    ArrowRight: ['right', 'laneRight'], KeyD: ['right', 'laneRight'],
    Space: ['jump'], ArrowUp: ['jump'], KeyW: ['jump'], KeyZ: ['jump'],
    KeyX: ['attack'], KeyJ: ['attack'], Enter: ['attack'],
    ShiftLeft: ['dodge'], ShiftRight: ['dodge'], KeyC: ['ability'],
  };
  const setKeys = (code, v) => { for (const k of KEYS[code] ?? []) input[k] = v; };

  addEventListener('keydown', (e) => {
    const typing = document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT';
    if (typing) return;
    if (e.code === 'KeyM') { audio.toggleMute(); return; }
    const s = campaign.screen;
    if (s === 'title') { startGame(campaign); audio.ui(); audio.ambient(true); screenT = 0; return; }
    if (s === 'intro' || s === 'interlude' || s === 'outro') {
      const beat = campaign.storyQueue[campaign.storyIndex];
      if (beat && dialogueT * 45 < beat.text.length) dialogueT = beat.text.length; // révéler tout
      else { advanceStory(campaign); audio.dialogue(); dialogueT = 0; screenT = 0; }
      e.preventDefault(); return;
    }
    if (s === 'hub') {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'KeyQ') { hubSel = Math.max(0, hubSel - 1); audio.ui(); }
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') { hubSel = Math.min(2, hubSel + 1); audio.ui(); }
      else if (e.code === 'Enter' || e.code === 'KeyX' || e.code === 'Space') {
        campaign.screen = hubSel === 0 ? 'map' : hubSel === 1 ? 'collection' : 'codex';
        audio.ui(); screenT = 0;
      }
      e.preventDefault(); return;
    }
    if (s === 'map') {
      if (e.code === 'Escape' || e.code === 'Backspace') { returnToHub(campaign); screenT = 0; }
      else if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'KeyQ') { mapSel = Math.max(0, mapSel - 1); audio.ui(); }
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') { mapSel = Math.min(gdl.levels.length - 1, mapSel + 1); audio.ui(); }
      else if (e.code === 'Enter' || e.code === 'KeyX' || e.code === 'Space') { startLevel(mapSel); audio.ambient(false); }
      e.preventDefault(); return;
    }
    if (s === 'collection' || s === 'codex') {
      if (e.code === 'Escape' || e.code === 'Backspace' || e.code === 'Enter' || e.code === 'Space') { returnToHub(campaign); screenT = 0; audio.ui(); }
      e.preventDefault(); return;
    }
    if (s === 'relic') {
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') { relicSel = 1 - relicSel; audio.ui(); }
      else if (e.code === 'Enter' || e.code === 'KeyX' || e.code === 'Space') {
        chooseRelic(campaign, campaign.pendingRelicChoice?.[relicSel]?.id);
        audio.relic();
        relicSel = 0; screenT = 0;
      }
      e.preventDefault(); return;
    }
    if (s === 'credits') {
      if (e.code === 'KeyR') { resetCampaign(campaign); audio.ambient(false); screenT = 0; }
      return;
    }
    if (s === 'pause') {
      if (e.code === 'KeyH') { returnToHub(campaign); game = null; audio.ambient(true); }
      else if (e.code === 'Escape' || e.code === 'Enter') campaign.screen = 'level';
      e.preventDefault(); return;
    }
    if (s === 'defeat') {
      if (e.code === 'Escape') { returnToHub(campaign); game = null; audio.ambient(true); }
      else if (e.code === 'Enter' || e.code === 'Space') { startLevel(campaign.levelIndex); audio.ambient(false); }
      e.preventDefault(); return;
    }
    if (s === 'level' && e.code === 'Escape') {
      campaign.screen = 'pause';
      e.preventDefault(); return;
    }
    setKeys(e.code, true);
    if (KEYS[e.code]) e.preventDefault();
  });
  addEventListener('keyup', (e) => setKeys(e.code, false));
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * vp.w;
    const s = campaign.screen;
    if (s === 'title') { startGame(campaign); screenT = 0; return; }
    if (s === 'intro' || s === 'interlude' || s === 'outro') { advanceStory(campaign); dialogueT = 0; return; }
    if (s === 'hub') {
      hubSel = Math.max(0, Math.min(2, Math.floor((x / vp.w) * 3)));
      campaign.screen = hubSel === 0 ? 'map' : hubSel === 1 ? 'collection' : 'codex';
      screenT = 0; return;
    }
    if (s === 'map') {
      mapSel = Math.max(0, Math.min(gdl.levels.length - 1, Math.round((x / vp.w) * (gdl.levels.length - 1))));
      if (mapSel < campaign.unlocked) startLevel(mapSel);
      return;
    }
    if (s === 'collection' || s === 'codex') { returnToHub(campaign); return; }
    if (s === 'relic') {
      relicSel = x < vp.w / 2 ? 0 : 1;
      chooseRelic(campaign, campaign.pendingRelicChoice?.[relicSel]?.id); return;
    }
    if (s === 'pause') { campaign.screen = 'level'; return; }
    if (s === 'defeat') { startLevel(campaign.levelIndex); }
  });

  // ── boucle ──
  const bgLayers = arenas[arenaPaths[0]]?.layers;
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    screenT += dt;
    const s = campaign.screen;

    if (s === 'outro-start') { startOutro(campaign); }

    if (s === 'level' && game) {
      // hitstop : micro-gel sur les impacts forts (game feel)
      hitstop = Math.max(0, hitstop - dt);
      const events = hitstop > 0 ? [] : step(game, input, dt);
      for (const ev of events) {
        if (ev.type === 'kill') hitstop = ev.boss ? 0.14 : 0.05;
        else if (ev.type === 'hurt') hitstop = 0.06;
      }
      audio.onEvents(events);
      fxFromEvents(fx, events, game, accent);
      render(ctx, game, { arena: arenas[gdl.levels[campaign.levelIndex].arena], rigs }, dt, fx);
      if (game.phase === 'won') { onLevelWon(campaign, game.score); audio.win(); audio.ambient(true); dialogueT = 0; screenT = 0; game = null; }
      else if (game.phase === 'lost') { lastResult = { score: game.score, deaths: game.deaths }; campaign.screen = 'defeat'; audio.ambient(true); screenT = 0; }
    } else if (s === 'title') {
      renderTitle(ctx, gdl, vp, screenT, bgLayers);
    } else if (s === 'hub') {
      renderHub(ctx, gdl, campaign, vp, screenT, bgLayers, hubSel, heroPortrait);
    } else if (s === 'map') {
      renderMap(ctx, gdl, campaign, vp, screenT, bgLayers, mapSel);
    } else if (s === 'collection') {
      renderCollection(ctx, gdl, campaign, vp, screenT, bgLayers);
    } else if (s === 'codex') {
      renderCodex(ctx, gdl, campaign, vp, screenT, bgLayers);
    } else if (s === 'intro' || s === 'interlude' || s === 'outro') {
      const beat = campaign.storyQueue[campaign.storyIndex];
      if (beat) {
        dialogueT += dt;
        renderStoryBackdrop(ctx, vp, screenT, bgLayers);
        renderDialogue(ctx, vp, beat, dialogueT, beat.portrait === 'hero' ? heroPortrait : null, accent);
      } else { advanceStory(campaign); }
    } else if (s === 'relic' && campaign.pendingRelicChoice) {
      renderRelicChoice(ctx, vp, campaign.pendingRelicChoice, relicSel, accent, screenT);
    } else if (s === 'credits') {
      renderCredits(ctx, gdl, campaign, vp, screenT);
    } else if (s === 'pause') {
      renderPause(ctx, gdl, vp);
    } else if (s === 'defeat') {
      renderDefeat(ctx, gdl, vp, lastResult.score, bgLayers, screenT);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  wireIteratePanel();
}

/** Panneau « Modifier par prompt » — dialogue avec la Forge (POST /iterate). */
function wireIteratePanel() {
  const form = document.getElementById('iterate-form');
  const inputEl = document.getElementById('iterate-input');
  const statusEl = document.getElementById('iterate-status');
  const toggle = document.getElementById('iterate-toggle');
  const panel = document.getElementById('iterate-panel');
  if (!form || !inputEl || !statusEl || !toggle || !panel) return;
  toggle.addEventListener('click', () => { panel.hidden = !panel.hidden; if (!panel.hidden) inputEl.focus(); });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const instruction = inputEl.value.trim();
    if (!instruction) return;
    statusEl.textContent = '⚙ La Forge applique ta demande…';
    try {
      const res = await fetch('iterate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ instruction }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        statusEl.textContent = `✔ ${data.summary ?? 'Modifié.'} Rechargement…`;
        setTimeout(() => location.reload(), 900);
      } else {
        statusEl.textContent = `✗ ${data.error ?? `HTTP ${res.status}`}`;
      }
    } catch {
      statusEl.textContent = '✗ Serveur d’itération indisponible (lance `pnpm forge:serve`).';
    }
  });
}

boot().catch((e) => {
  console.error(e);
  const el = document.getElementById('boot-error');
  if (el) { el.hidden = false; el.textContent = `Erreur de chargement : ${e.message}`; }
});
