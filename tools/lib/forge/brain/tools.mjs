/**
 * OUTILS DE JARVIS — les capacités RÉELLES qu'il peut invoquer (il agit, il ne
 * décrit pas). Chaque outil : name, description, args (schéma lisible), run().
 * Tout réutilise la Forge existante — aucune logique dupliquée.
 */
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { iterateGame } from '../iterate.mjs';

const ROOT = process.cwd();
const WS = join(ROOT, 'workspaces');

async function readJson(p) { try { return JSON.parse(await readFile(p, 'utf8')); } catch { return null; } }

async function forgedGames() {
  if (!existsSync(WS)) return [];
  const out = [];
  for (const d of await readdir(WS)) {
    const gdl = await readJson(join(WS, d, '05_runtime', 'game.gdl.json'));
    if (gdl) out.push({ id: d, gdl });
  }
  return out;
}

export const TOOLS = {
  list_games: {
    description: 'Liste les jeux forgés (id, titre, genre, nombre de niveaux). Aucun argument.',
    args: {},
    async run() {
      const games = await forgedGames();
      if (!games.length) return { games: [], note: 'Aucun jeu forgé pour le moment.' };
      return {
        games: games.map(({ id, gdl }) => ({
          id, title: gdl.title, genre: gdl.genre, levels: gdl.levels?.length ?? 0,
          hero: Object.values(gdl.entities ?? {}).find((e) => e.role === 'hero')?.name,
        })),
      };
    },
  },

  game_status: {
    description: 'État détaillé d’un jeu : héros, stats, niveaux, boss, reliques, résultat du dernier auto-play, historique des modifications. Argument : { id }.',
    args: { id: 'identifiant du jeu (voir list_games)' },
    async run({ id }) {
      const gdl = await readJson(join(WS, id, '05_runtime', 'game.gdl.json'));
      if (!gdl) return { error: `Jeu « ${id} » introuvable.` };
      const report = await readJson(join(WS, id, 'forge-build.json'));
      const hero = Object.entries(gdl.entities).find(([, e]) => e.role === 'hero');
      return {
        id, title: gdl.title, genre: gdl.genre,
        hero: hero ? { name: hero[1].name, stats: hero[1].stats } : null,
        enemies: Object.values(gdl.entities).filter((e) => e.role === 'enemy').map((e) => e.name),
        boss: Object.values(gdl.entities).find((e) => e.role === 'boss')?.name ?? null,
        levels: (gdl.levels ?? []).map((l) => l.name ?? l.id),
        relics: (gdl.relics ?? []).map((r) => r.name),
        autoplay: report?.autoplay ? { won: report.autoplay.won, kills: report.autoplay.kills } : null,
        iterations: (gdl.meta?.iterations ?? []).map((it) => it.summary),
      };
    },
  },

  iterate_game: {
    description: 'Modifie un jeu par une instruction en langage naturel, puis re-valide toute la campagne à l’auto-play (un patch qui casse la jouabilité est refusé). Arguments : { id, instruction }. Ex. instruction : « rends le héros plus rapide », « plus difficile », « ajoute un niveau », « renomme le jeu en … ».',
    args: { id: 'identifiant du jeu', instruction: 'la modification souhaitée, en français' },
    async run({ id, instruction }) {
      if (!existsSync(join(WS, id, '05_runtime', 'game.gdl.json'))) return { error: `Jeu « ${id} » introuvable.` };
      const r = await iterateGame(join(WS, id), instruction ?? '');
      return r.ok
        ? { ok: true, applied: r.summary, revalidated: `bot vainqueur (${r.autoplay.kills} kills, ${r.autoplay.deaths} morts)` }
        : { ok: false, refused: r.error };
    },
  },

  list_connections: {
    description: 'État des connexions externes qui renforcent le studio (fal.ai, ComfyUI, Anthropic, etc.) : lesquelles sont actives, ce qu’elles débloquent. Aucun argument.',
    args: {},
    async run() {
      const rep = await readJson(join(ROOT, '08_ops', 'manifests', 'connections-report.json'));
      if (!rep) return { note: 'Rapport absent — lance `pnpm forge:connections` pour le générer.' };
      return {
        active: rep.connections.filter((c) => c.ok).map((c) => c.id),
        inactive: rep.connections.filter((c) => !c.ok).map((c) => ({ id: c.id, unlocks: c.unlocks })),
      };
    },
  },
};

/** Specs OpenAI (function-calling natif) dérivées de TOOLS. */
export function toolSpecs() {
  return Object.entries(TOOLS).map(([name, t]) => ({
    type: 'function',
    function: {
      name,
      description: t.description,
      parameters: {
        type: 'object',
        properties: Object.fromEntries(Object.entries(t.args).map(([k, desc]) => [k, { type: 'string', description: desc }])),
        required: Object.keys(t.args),
      },
    },
  }));
}

export async function runTool(name, args) {
  const tool = TOOLS[name];
  if (!tool) return { error: `Outil inconnu : ${name}` };
  try { return await tool.run(args ?? {}); }
  catch (e) { return { error: `Échec de ${name} : ${e.message}` }; }
}
