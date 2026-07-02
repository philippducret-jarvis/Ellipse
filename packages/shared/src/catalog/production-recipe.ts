/**
 * Recettes de production par type de jeu — « comment traiter un jeu dans sa globalité ».
 *
 * Dérive du catalogue (`GAME_TYPES`) le **pipeline d'agents** (design → art → animation → niveau →
 * systèmes → audio → UI → FX → assemblage → QA) et les **gates QA spécifiques** au genre.
 * Consommé par l'orchestrateur durable (qui exécute les étapes) et le studio (qui les affiche).
 */
import { getGameType } from './game-types.js';

export interface ProductionStage {
  id: string;
  label: string;
  agents: string[];
  outputs: string[];
}
export interface ProductionRecipe {
  game_type: string;
  stages: ProductionStage[];
  qa_gates: string[];
}

const CHARACTER_FAMILY_HINTS = ['hero', 'heroes_roster', 'party', 'units', 'fighters', 'npcs', 'ships', 'vehicles'];
const ENEMY_HINTS = ['enemies', 'enemy_horde', 'bosses'];
const DECOR_HINTS = ['tileset', 'parallax_bg', 'backgrounds', 'board_bg', 'scenes', 'terrain_tiles', 'biomes'];

const LOOP_QA_GATE: Record<string, string> = {
  platforming: 'traversabilité (sauts faisables)',
  combat: 'équilibrage combat (TTK, dégâts)',
  puzzle: 'solvabilité (au moins une solution)',
  narrative: 'cohérence narrative (canon, embranchements)',
  rhythm: 'synchronisation audio/entrées',
  racing: 'praticabilité du circuit',
  shooting: 'lisibilité projectiles / hitbox',
  tactics: 'équilibrage des unités',
  survival: 'courbe de difficulté (montée des vagues)',
  management: 'équilibrage économie',
  deckbuilding: 'équilibrage des cartes',
  building: 'validité des placements',
  stealth: 'champs de vision cohérents',
  sports: 'règles respectées',
};

export function buildProductionRecipe(gameTypeId: string): ProductionRecipe {
  const type = getGameType(gameTypeId);
  if (!type) throw new Error(`Type inconnu : ${gameTypeId}`);
  const families = type.library.asset_families;
  const has = (hints: string[]) => hints.some((h) => families.includes(h));

  const stages: ProductionStage[] = [];

  // 1. Design (Cortex maîtresse) — intention → game_spec
  stages.push({ id: 'design', label: 'Conception', agents: ['cortex_master', 'narrative'], outputs: ['game_spec', 'art_bible'] });

  // 2. Art (familles d'assets → agents)
  const artAgents: string[] = [];
  if (has(CHARACTER_FAMILY_HINTS) || has(ENEMY_HINTS)) artAgents.push('character');
  if (has(DECOR_HINTS)) artAgents.push('decor');
  if (families.includes('ui_kit')) artAgents.push('ui');
  if (families.includes('fx')) artAgents.push('vfx');
  if (artAgents.length) stages.push({ id: 'art', label: 'Direction artistique & assets', agents: artAgents, outputs: ['asset_pack'] });

  // 3. Animation (si personnages)
  if (has(CHARACTER_FAMILY_HINTS) || has(ENEMY_HINTS)) {
    stages.push({ id: 'animation', label: 'Animation', agents: ['animation'], outputs: ['atlas', 'animation_manifest'] });
  }

  // 4. Niveau / carte (selon map_kind)
  stages.push({ id: 'level', label: `Carte (${type.library.map_kind})`, agents: ['level'], outputs: ['scene', 'collision_map'] });

  // 5. Systèmes (gameplay + code-gen)
  stages.push({ id: 'systems', label: 'Systèmes de jeu', agents: ['gameplay', 'codegen'], outputs: type.library.systems });

  // 6. Audio
  stages.push({ id: 'audio', label: 'Audio', agents: ['music', 'sfx'], outputs: [type.library.audio_profile] });

  // 7. Assemblage
  stages.push({ id: 'assembly', label: 'Assemblage runtime', agents: ['integration', 'camera'], outputs: ['preview_bundle'] });

  // 8. QA
  stages.push({ id: 'qa', label: 'QA & validation', agents: ['qa'], outputs: ['qa_report'] });

  // Gates QA = perf/lisibilité (toujours) + gates par boucle de jeu
  const gates = new Set<string>(['performance mobile', 'lisibilité visuelle', 'validation GDL', 'smoke test runtime']);
  for (const loop of type.core_loops) {
    const g = LOOP_QA_GATE[loop];
    if (g) gates.add(g);
  }
  if (type.difficulty_band === 'souls') gates.add('courbe de difficulté (souls : punitif mais juste)');

  return { game_type: type.id, stages, qa_gates: [...gates] };
}
