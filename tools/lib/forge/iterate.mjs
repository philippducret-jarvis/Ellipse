/**
 * ITÉRATION PAR PROMPT — le dialogue avec un jeu forgé.
 *
 * « Rends le héros plus rapide », « plus difficile », « ajoute un niveau »,
 * « renomme le jeu en … » → patch du GDL, RE-VALIDATION complète (chaque
 * niveau doit rester complétable par le bot) puis écriture. Un patch qui
 * casse la jouabilité est refusé et annulé.
 *
 * Cerveaux : heuristique FR/EN (déterministe, hors-ligne) ; si une clé
 * ANTHROPIC_API_KEY est présente et que l'heuristique ne comprend pas,
 * Claude propose les opérations (même format, même validation).
 * Historique : meta.iterations[] + 02_design/forge-iterations.md.
 */
import { readFile, writeFile, mkdir, appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import { validateGdl } from './gdl.mjs';
import { autoplay } from './autoplay.mjs';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Règles comprises hors-ligne. Chaque règle → liste d'opérations + résumé. */
const RULES = [
  {
    match: /(héros|hero|personnage|perso|joueur).*(plus rapide|plus vite)|(?:plus rapide|plus vite).*(héros|hero|personnage)/i,
    ops: [{ kind: 'heroStat', stat: 'speed', mul: 1.25 }], summary: 'Vitesse du héros +25 %',
  },
  { match: /(héros|hero|personnage|perso).*(plus lent|moins (rapide|vite))/i, ops: [{ kind: 'heroStat', stat: 'speed', mul: 0.8 }], summary: 'Vitesse du héros −20 %' },
  { match: /ennemis?.*(plus rapides?|plus vite)/i, ops: [{ kind: 'enemyStat', stat: 'speed', mul: 1.25 }], summary: 'Ennemis +25 % de vitesse' },
  { match: /ennemis?.*(plus lents?|moins vite)/i, ops: [{ kind: 'enemyStat', stat: 'speed', mul: 0.8 }], summary: 'Ennemis −20 % de vitesse' },
  { match: /saut.*(haut|puissant|loin|fort)|améliore.*saut|jump.*(higher|stronger)/i, ops: [{ kind: 'heroStat', stat: 'jump', mul: 1.15 }], summary: 'Saut du héros +15 %' },
  { match: /(plus de (vie|cœurs|coeurs|pv|hp))|(vie|cœurs|coeurs).*(plus|davantage)/i, ops: [{ kind: 'heroStat', stat: 'hp', add: 2 }], summary: '+2 cœurs pour le héros' },
  { match: /(dégâts|degats|damage|frappe).*(plus|fort)|plus de dégâts/i, ops: [{ kind: 'heroStat', stat: 'damage', add: 1 }], summary: 'Dégâts du héros +1' },
  {
    match: /plus (difficile|dur|corsé)|difficulté.*(monte|augmente)|harder/i,
    ops: [{ kind: 'enemyStat', stat: 'hp', add: 1 }, { kind: 'enemyStat', stat: 'speed', mul: 1.12 }],
    summary: 'Difficulté augmentée (ennemis +1 PV, +12 % vitesse)',
  },
  {
    match: /plus (facile|simple|accessible)|easier/i,
    ops: [{ kind: 'enemyStat', stat: 'hp', add: -1, min: 1 }, { kind: 'heroStat', stat: 'hp', add: 1 }],
    summary: 'Difficulté réduite (ennemis −1 PV, héros +1 cœur)',
  },
  { match: /boss.*(plus (dur|difficile|fort)|renforce)/i, ops: [{ kind: 'bossStat', stat: 'hp', add: 6 }], summary: 'Boss renforcé (+6 PV)' },
  { match: /boss.*(plus (facile|faible)|affaiblis?)/i, ops: [{ kind: 'bossStat', stat: 'hp', add: -5, min: 4 }], summary: 'Boss affaibli (−5 PV)' },
  { match: /ajoute\s+(un|1)\s+niveau|add\s+a?\s*level/i, ops: [{ kind: 'addLevel' }], summary: 'Un niveau ajouté à la campagne' },
  { match: /renomme.*jeu.*en\s+["«»']?(.+?)["«»']?\s*$|titre\s*[:=]\s*(.+)$/i, ops: [{ kind: 'rename' }], summary: 'Jeu renommé', capture: true },
];

export function parseInstruction(instruction) {
  const allOps = [];
  const summaries = [];
  for (const rule of RULES) {
    const m = instruction.match(rule.match);
    if (!m) continue;
    for (const op of rule.ops) allOps.push(rule.capture ? { ...op, value: (m[1] ?? m[2] ?? '').trim() } : op);
    summaries.push(rule.summary);
  }
  return allOps.length ? { ops: allOps, summary: summaries.join(' · ') } : null;
}

/** Fallback Claude : mêmes opérations, même validation derrière. */
async function claudeParse(instruction, gdl) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.FORGE_DESIGN_MODEL || 'claude-sonnet-5',
      max_tokens: 700,
      system: 'Tu traduis une demande de modification de jeu en opérations JSON. Réponds UNIQUEMENT un JSON {"ops":[…],"summary":"…"}. Ops permises : {"kind":"heroStat|enemyStat|bossStat","stat":"speed|jump|hp|damage","mul"?:number,"add"?:number} · {"kind":"addLevel"} · {"kind":"rename","value":"…"}. Refuse (ops:[]) ce qui sort de ce cadre.',
      messages: [{ role: 'user', content: `Jeu : ${gdl.title} (${gdl.genre}, ${gdl.levels.length} niveaux). Demande : "${instruction}"` }],
    }),
  }).catch(() => null);
  if (!res?.ok) return null;
  try {
    const data = await res.json();
    const parsed = JSON.parse(data.content[0].text.replace(/^```json?\s*|\s*```$/g, ''));
    return parsed.ops?.length ? parsed : null;
  } catch { return null; }
}

function applyOps(gdl, ops) {
  const next = structuredClone(gdl);
  const heroKey = Object.entries(next.entities).find(([, e]) => e.role === 'hero')?.[0];
  for (const op of ops) {
    if (op.kind === 'heroStat' && heroKey) {
      const s = next.entities[heroKey].stats;
      s[op.stat] = clamp((s[op.stat] ?? 0) * (op.mul ?? 1) + (op.add ?? 0), op.min ?? 1, op.stat === 'hp' ? 12 : 1e6);
    } else if (op.kind === 'enemyStat' || op.kind === 'bossStat') {
      const role = op.kind === 'bossStat' ? 'boss' : 'enemy';
      for (const e of Object.values(next.entities)) {
        if (e.role !== role) continue;
        e.stats[op.stat] = clamp((e.stats[op.stat] ?? 0) * (op.mul ?? 1) + (op.add ?? 0), op.min ?? 1, 1e6);
      }
    } else if (op.kind === 'rename' && op.value) {
      next.title = op.value;
    } else if (op.kind === 'addLevel') {
      addLevel(next);
    }
  }
  return next;
}

/** Nouveau niveau inséré avant le boss (le boss reste le final). */
function addLevel(gdl) {
  const n = gdl.levels.length;
  const template = gdl.levels.find((l) => !l.boss) ?? gdl.levels[0];
  const id = `level-${String(n + 1).padStart(2, '0')}`;
  let level;
  if (gdl.genre === 'sidescroller') {
    const length = Math.round((template.length ?? 4200) * 1.1);
    const rnd = (() => { let s = gdl.seed + n * 977; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
    level = { id, name: `Terres Oubliées ${n - 1}`, boss: false, arena: template.arena, length, spawns: [], hazards: [], pickups: [], checkpoints: [Math.round(length * 0.5)], exit: { x: length - 220 } };
    const kinds = Object.entries(gdl.entities).filter(([, e]) => e.role === 'enemy').map(([k]) => k);
    let x = 750;
    while (x < length - 700) {
      level.spawns.push({ entity: kinds[(rnd() * kinds.length) | 0], x: Math.round(x) });
      if (rnd() < 0.45) level.hazards.push({ x: Math.round(x + 280), w: 120, type: 'spikes', damage: 1 });
      if (rnd() < 0.3) level.pickups.push({ x: Math.round(x + 140), type: rnd() < 0.6 ? 'gem' : 'heart' });
      x += 480 + rnd() * 400;
    }
  } else {
    const waves = (template.waves ?? []).map((w, i) => ({ t: 3 + i * 5, lane: (i * 7) % 3, entity: w.entity }));
    level = { id, name: `Veille ${n + 1}`, boss: false, arena: template.arena, waves };
  }
  const bossIdx = gdl.levels.findIndex((l) => l.boss);
  if (bossIdx >= 0) gdl.levels.splice(bossIdx, 0, level);
  else gdl.levels.push(level);
  // recaler la carte
  gdl.map = gdl.map ?? { title: 'Carte du monde' };
  gdl.map.nodes = gdl.levels.map((l, i) => ({ level: l.id, x: 0.14 + (i * 0.72) / Math.max(1, gdl.levels.length - 1), y: i % 2 ? 0.42 : 0.56, name: l.name ?? `Niveau ${i + 1}` }));
}

/**
 * Applique une instruction à un jeu forgé. Refuse tout patch qui rend un
 * niveau non complétable. @returns {ok, summary?, error?, autoplay?}
 */
export async function iterateGame(wsDir, instruction) {
  const gdlPath = join(wsDir, '05_runtime', 'game.gdl.json');
  let gdl;
  try { gdl = JSON.parse(await readFile(gdlPath, 'utf8')); }
  catch { return { ok: false, error: 'game.gdl.json introuvable (jeu non forgé ?)' }; }

  let parsed = parseInstruction(instruction);
  if (!parsed) parsed = await claudeParse(instruction, gdl);
  if (!parsed) {
    return { ok: false, error: 'Demande non comprise. Essaie : « héros plus rapide », « plus difficile », « saut plus haut », « plus de vie », « boss plus dur », « ajoute un niveau », « renomme le jeu en … ».' };
  }

  const next = applyOps(gdl, parsed.ops);
  try { validateGdl(next); } catch (e) { return { ok: false, error: `GDL invalide après patch : ${e.message}` }; }

  const play = await autoplay(next);
  if (!play.won) {
    const failed = play.levels.find((l) => !l.won);
    return { ok: false, error: `Refusé : le niveau ${failed?.level} deviendrait infranchissable (le bot échoue). Le jeu n'a pas été modifié.` };
  }

  next.meta = next.meta ?? {};
  next.meta.iterations = [...(next.meta.iterations ?? []), { at: new Date().toISOString(), instruction, summary: parsed.summary }];
  await writeFile(gdlPath, JSON.stringify(next, null, 2), 'utf8');

  await mkdir(join(wsDir, '02_design'), { recursive: true });
  await appendFile(join(wsDir, '02_design', 'forge-iterations.md'), `- ${new Date().toISOString()} — « ${instruction} » → ${parsed.summary}\n`, 'utf8');

  return { ok: true, summary: parsed.summary, autoplay: { kills: play.kills, deaths: play.deaths, simSeconds: play.simSeconds } };
}
