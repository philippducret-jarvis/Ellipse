/**
 * OUTILS D'ELLISPHERE — observations réelles et actions bornées sur le studio.
 * Les runtimes spécialisés sont protégés contre toute réécriture Forge générique.
 */
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { iterateGame } from '../iterate.mjs';

const ROOT = process.cwd();
const WS = join(ROOT, 'workspaces');
const SPECIALIZED = new Map([
  ['orbes-d-astra', { runtime: 'merge_drop_engine', rebuild: 'pnpm orbes:build' }],
  ['veloria-veille-des-lames', { runtime: 'veloria_engine', rebuild: 'pnpm veloria:hd' }],
  ['echoes-of-the-mushroom-realm', { runtime: 'echoes_platformer_engine', rebuild: 'pnpm echoes:hd' }],
]);

async function readJson(path) {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch { return null; }
}

function inside(root, candidate) {
  const rel = relative(resolve(root), resolve(candidate));
  return rel === '' || (!rel.startsWith('..') && !rel.includes(`..${process.platform === 'win32' ? '\\' : '/'}`));
}

async function resolveGdl(id, workspace) {
  const root = join(WS, id);
  const candidates = [];
  const url = workspace?.gdl_url;
  if (typeof url === 'string') {
    const prefix = `/workspaces/${id}/`;
    const clean = url.startsWith(prefix) ? url.slice(prefix.length) : url.replace(/^\.\//u, '');
    const path = join(root, ...clean.split('/'));
    if (inside(root, path)) candidates.push(path);
  }
  const gdlDir = join(root, '05_runtime', 'gdl');
  if (existsSync(gdlDir)) {
    const names = (await readdir(gdlDir)).filter((name) => name.endsWith('.json')).sort((a, b) => {
      const ap = a.includes('preview.gdl') ? 0 : 1;
      const bp = b.includes('preview.gdl') ? 0 : 1;
      return ap - bp || a.localeCompare(b);
    });
    candidates.push(...names.map((name) => join(gdlDir, name)));
  }
  candidates.push(join(root, '05_runtime', 'game.gdl.json'));
  for (const path of [...new Set(candidates)]) {
    const gdl = await readJson(path);
    if (gdl) return { path, gdl };
  }
  return null;
}

async function forgedGames() {
  if (!existsSync(WS)) return [];
  const out = [];
  for (const entry of await readdir(WS, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const id = entry.name;
    const workspace = await readJson(join(WS, id, 'workspace.json')) ?? {};
    const resolved = await resolveGdl(id, workspace);
    if (resolved) out.push({ id, workspace, ...resolved });
  }
  return out;
}

function values(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

function summaryOf({ id, workspace, gdl, path }) {
  const entities = values(gdl.entities);
  const scenes = Array.isArray(gdl.scenes) ? gdl.scenes : Array.isArray(gdl.levels) ? gdl.levels : [];
  const title = gdl.meta?.title ?? gdl.title ?? workspace.title ?? id;
  const genre = gdl.meta?.genre ?? gdl.genre ?? workspace.genre ?? null;
  const hero = entities.find((entity) => entity?.role === 'hero' || entity?.type === 'player' || entity?.id === 'player');
  return {
    id,
    title,
    genre,
    status: workspace.status ?? 'unknown',
    runtime: workspace.runtime ?? SPECIALIZED.get(id)?.runtime ?? 'forge',
    dimension: workspace.dimension ?? gdl.meta?.dimension ?? gdl.style?.dimension ?? null,
    levels: scenes.length,
    hero: hero?.name ?? hero?.id ?? null,
    preview_url: workspace.preview_url ?? null,
    gdl: relative(ROOT, path).replaceAll('\\', '/'),
    specialized: SPECIALIZED.has(id),
  };
}

async function gameById(id) {
  return (await forgedGames()).find((game) => game.id === id) ?? null;
}

async function qualityReports(id) {
  const dir = join(WS, id, '08_ops', 'manifests');
  if (!existsSync(dir)) return [];
  const reports = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const data = await readJson(join(dir, entry.name));
    if (!data) continue;
    const commercialReady = data.deliverable?.commercial_ready ?? data.commercial_ready;
    const remaining = data.deliverable?.remaining_release_gates ?? data.remaining_gates ?? data.remaining_release_gates;
    const checks = data.deliverable?.checks ?? (data.summary ? `${data.summary.passed ?? '?'}/${data.summary.total ?? '?'}` : undefined);
    reports.push({
      file: entry.name,
      status: data.deliverable?.status ?? data.status ?? null,
      commercial_ready: typeof commercialReady === 'boolean' ? commercialReady : null,
      checks: checks ?? null,
      remaining_gates: Array.isArray(remaining) ? remaining : [],
      generated_at: data.generated_at ?? null,
    });
  }
  return reports.sort((a, b) => a.file.localeCompare(b.file));
}

export const TOOLS = {
  list_games: {
    description: 'Liste tous les jeux réellement découverts via workspace.json et leurs GDL modernes ou historiques. Aucun argument.',
    args: {},
    async run() {
      const games = await forgedGames();
      return {
        games: games.map(summaryOf),
        protected_specialized_games: [...SPECIALIZED.keys()],
        note: games.length ? undefined : 'Aucun jeu avec GDL lisible pour le moment.',
      };
    },
  },

  game_status: {
    description: 'État détaillé et factuel d’un jeu moderne ou historique. Argument : { id }.',
    args: { id: 'identifiant du jeu (voir list_games)' },
    async run({ id }) {
      const game = await gameById(id);
      if (!game) return { error: `Jeu « ${id} » introuvable ou sans GDL lisible.` };
      const { gdl, workspace } = game;
      const entities = values(gdl.entities);
      const scenes = Array.isArray(gdl.scenes) ? gdl.scenes : Array.isArray(gdl.levels) ? gdl.levels : [];
      const report = await readJson(join(WS, id, 'forge-build.json'));
      const hero = entities.find((entity) => entity?.role === 'hero' || entity?.type === 'player' || entity?.id === 'player');
      return {
        ...summaryOf(game),
        hero: hero ? { id: hero.id ?? null, name: hero.name ?? hero.id ?? null, stats: hero.stats ?? null } : null,
        enemies: entities.filter((entity) => entity?.role === 'enemy' || entity?.role === 'boss' || entity?.type === 'enemy').map((entity) => entity.name ?? entity.id),
        boss: entities.find((entity) => entity?.role === 'boss')?.name ?? null,
        levels: scenes.map((scene) => scene.title ?? scene.name ?? scene.id),
        systems: Array.isArray(gdl.systems) ? gdl.systems : [],
        autoplay: report?.autoplay ? { won: report.autoplay.won, kills: report.autoplay.kills, deaths: report.autoplay.deaths } : null,
        updated_at: workspace.updated_at ?? gdl.meta?.updated_at ?? null,
        quality_reports: await qualityReports(id),
      };
    },
  },

  quality_status: {
    description: 'Lit les manifestes QA actifs d’un jeu sans confondre jouable, HD et commercialement prêt. Argument : { id }.',
    args: { id: 'identifiant du jeu' },
    async run({ id }) {
      const game = await gameById(id);
      if (!game) return { error: `Jeu « ${id} » introuvable.` };
      const reports = await qualityReports(id);
      const declaredCommercial = reports.filter((report) => report.commercial_ready != null);
      return {
        id,
        title: summaryOf(game).title,
        workspace_status: game.workspace.status ?? 'unknown',
        commercial_ready: declaredCommercial.length > 0 && declaredCommercial.every((report) => report.commercial_ready === true),
        reports,
        warning: 'Une validation automatique ne remplace pas la revue visuelle et le test sur appareil réel.',
      };
    },
  },

  iterate_game: {
    description: 'Modifie uniquement un jeu Forge générique puis le revalide. Les trois jeux HD spécialisés sont protégés et doivent passer par leur pipeline dédié. Arguments : { id, instruction }.',
    args: { id: 'identifiant du jeu', instruction: 'modification souhaitée, en français' },
    async run({ id, instruction }) {
      const game = await gameById(id);
      if (!game) return { error: `Jeu « ${id} » introuvable.` };
      const specialized = SPECIALIZED.get(id);
      if (specialized) {
        return {
          ok: false,
          protected: true,
          refused: `« ${id} » possède un runtime spécialisé. Une itération Forge générique détruirait sa fidélité visuelle et ses systèmes dédiés.`,
          required_pipeline: specialized.rebuild,
        };
      }
      const legacyPath = join(WS, id, '05_runtime', 'game.gdl.json');
      if (!existsSync(legacyPath)) return { error: `Le jeu « ${id} » n’utilise pas un GDL Forge itérable.` };
      const result = await iterateGame(join(WS, id), instruction ?? '');
      return result.ok
        ? { ok: true, applied: result.summary, revalidated: `bot vainqueur (${result.autoplay.kills} kills, ${result.autoplay.deaths} morts)` }
        : { ok: false, refused: result.error };
    },
  },

  agent_status: {
    description: 'Expose les manifestes d’agents et de formation réellement présents pour un jeu. Argument : { id }.',
    args: { id: 'identifiant du jeu' },
    async run({ id }) {
      if (!existsSync(join(WS, id))) return { error: `Jeu « ${id} » introuvable.` };
      const dir = join(WS, id, '08_ops', 'manifests');
      const files = ['ellisphere-team.json', 'agent-capabilities.json', 'agent-handoffs.json', 'agent-work-orders.json', 'training-roadmap.json'];
      const manifests = {};
      for (const file of files) {
        const data = await readJson(join(dir, file));
        if (data) manifests[file.replace('.json', '')] = data;
      }
      return {
        id,
        manifests,
        operational: Object.keys(manifests).length > 0,
        missing: files.filter((file) => !Object.hasOwn(manifests, file.replace('.json', ''))),
      };
    },
  },

  list_connections: {
    description: 'État des connexions externes disponibles pour renforcer le studio. Aucun argument.',
    args: {},
    async run() {
      const report = await readJson(join(ROOT, '08_ops', 'manifests', 'connections-report.json'));
      if (!report) return { note: 'Rapport absent — lance `pnpm forge:connections` pour le générer.' };
      const connections = Array.isArray(report.connections) ? report.connections : [];
      return {
        active: connections.filter((connection) => connection.ok).map((connection) => connection.id),
        inactive: connections.filter((connection) => !connection.ok).map((connection) => ({ id: connection.id, unlocks: connection.unlocks })),
      };
    },
  },
};

/** Specs OpenAI (function-calling natif) dérivées de TOOLS. */
export function toolSpecs() {
  return Object.entries(TOOLS).map(([name, tool]) => ({
    type: 'function',
    function: {
      name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: Object.fromEntries(Object.entries(tool.args).map(([key, description]) => [key, { type: 'string', description }])),
        required: Object.keys(tool.args),
        additionalProperties: false,
      },
    },
  }));
}

export async function runTool(name, args) {
  const tool = TOOLS[name];
  if (!tool) return { error: `Outil inconnu : ${name}` };
  try { return await tool.run(args ?? {}); }
  catch (error) { return { error: `Échec de ${name} : ${error instanceof Error ? error.message : String(error)}` }; }
}
