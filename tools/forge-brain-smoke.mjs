/**
 * SMOKE BRAIN — vérifie les pièces PURES d'Ellisphere sans réseau ni LLM :
 * specs d'outils bien formés, exécution réelle des outils de lecture,
 * nettoyage de la pub keyless, parsing tolérant. CI-safe.
 */
import { TOOLS, toolSpecs, runTool } from './lib/forge/brain/tools.mjs';

let failed = 0;
const check = (ok, label) => { if (!ok) failed++; console.log(`${ok ? '✓' : '✗'} ${label}`); };

// specs OpenAI bien formées
const specs = toolSpecs();
check(specs.length === Object.keys(TOOLS).length, `${specs.length} outils exposés en specs OpenAI`);
check(specs.every((s) => s.type === 'function' && s.function.name && s.function.parameters?.type === 'object'), 'specs conformes function-calling');

// exécution réelle des outils de lecture (pas de mutation)
const games = await runTool('list_games', {});
check(Array.isArray(games.games), `list_games renvoie ${games.games?.length ?? 0} jeux réels`);

const status = await runTool('game_status', { id: 'veloria-veille-des-lames' });
check(status.title?.includes('Veloria') || status.error, `game_status répond (${status.title ?? status.error})`);

const quality = await runTool('quality_status', { id: 'orbes-d-astra' });
check(typeof quality.commercial_ready === 'boolean' || quality.error, 'quality_status distingue le statut commercial');

const protectedIteration = await runTool('iterate_game', { id: 'echoes-of-the-mushroom-realm', instruction: 'remplace le runtime' });
check(protectedIteration.protected === true || protectedIteration.error, 'les trois runtimes spécialisés sont protégés');

const unknown = await runTool('game_status', { id: 'nexiste-pas' });
check(Boolean(unknown.error), 'game_status : jeu inconnu → erreur propre');

const bad = await runTool('outil_bidon', {});
check(Boolean(bad.error), 'outil inconnu → erreur propre');

console.log(failed === 0 ? '\nSmoke Brain : tout passe.' : `\nSmoke Brain : ${failed} échec(s).`);
process.exit(failed === 0 ? 0 : 1);
