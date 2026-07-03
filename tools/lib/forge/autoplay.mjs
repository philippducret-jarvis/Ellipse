/** AUTO-PLAY headless — un bot joue chaque niveau ; module léger (logic pure). */
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

export async function autoplayLevel(gdl, levelIndex, { maxSimSeconds = 240 } = {}) {
  const { createGame, step, botInput } = await import(pathToFileURL(join(HERE, 'runtime', 'logic.js')).href);
  const state = createGame(gdl, levelIndex);
  const dt = 1 / 60;
  let simT = 0, kills = 0, pickups = 0;
  while (state.phase === 'playing' && simT < maxSimSeconds) {
    const events = step(state, botInput(state), dt);
    for (const e of events) { if (e.type === 'kill') kills++; if (e.type === 'pickup') pickups++; }
    simT += dt;
  }
  return {
    level: gdl.levels[levelIndex].id,
    won: state.phase === 'won', simSeconds: Math.round(simT), kills, pickups, deaths: state.deaths, score: state.score,
    progress: gdl.genre === 'sidescroller' && !gdl.levels[levelIndex].boss
      ? Math.round((state.hero.x / (state.level.exit?.x ?? state.level.length)) * 100)
      : null,
  };
}

/** La campagne ENTIÈRE doit être complétable. */
export async function autoplay(gdl, opts = {}) {
  const levels = [];
  let allWon = true, kills = 0, deaths = 0, score = 0, simSeconds = 0;
  for (let i = 0; i < gdl.levels.length; i++) {
    const r = await autoplayLevel(gdl, i, opts);
    levels.push(r);
    allWon = allWon && r.won;
    kills += r.kills; deaths += r.deaths; score += r.score; simSeconds += r.simSeconds;
  }
  const failed = levels.find((l) => !l.won);
  return { won: allWon, levels, kills, deaths, score, simSeconds, progress: failed?.progress ?? 100 };
}
