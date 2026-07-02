/**
 * Moteur de génération de code autonome — l'IA/les agents fabriquent, modifient et optimisent
 * le code d'un jeu **par type**.
 *
 * À partir d'un `ProductionPreset`, génère un projet de jeu : GDL jouable + **scaffolds TypeScript**
 * pour chaque système déclaré non encore implémenté (signature correcte contre l'API runtime de
 * `@ellipse/engine`) + un **brief développeur** expliquant comment créer/modifier/optimiser.
 *
 * Pur (chaînes de caractères) → testable. Un agent (ou l'orchestrateur) écrit ensuite ces fichiers.
 */
import type { ProductionPreset } from '../catalog/game-types.js';
import { resolveLibraryPlan } from '../catalog/library-plan.js';
import { buildStarterGdl, type StarterGdlOptions } from '../catalog/starter-game.js';

export interface GeneratedFile {
  path: string;
  content: string;
}
export interface GeneratedProject {
  game_type: string;
  files: GeneratedFile[];
  planned_systems: string[];
}

/** Savoir-faire par système : ce qu'il fait + piste d'optimisation (consommé par les agents). */
export const SYSTEM_KNOWLEDGE: Record<string, { summary: string; optimize: string }> = {
  gacha_summon: { summary: 'Tirage pondéré par rareté + système de pitié (garanti après N tirages).', optimize: 'Pré-calculer la table cumulative des probabilités ; éviter les allocations par tirage.' },
  summon_units: { summary: 'Invoque des unités alliées contrôlées par IA simple.', optimize: 'Pooler les entités invoquées ; limiter le nombre actif simultané.' },
  falling_blocks: { summary: 'Pièces tombant sur une grille, rotation, verrouillage.', optimize: 'Grille en tableau typé (Int8Array) ; ne recalculer que les lignes touchées.' },
  line_clear: { summary: 'Détection et suppression des lignes complètes + gravité.', optimize: 'Scanner uniquement les lignes modifiées par le dernier verrou.' },
  grid_match: { summary: 'Détection d’alignements 3+ et cascades.', optimize: 'Flood-fill borné + file de cellules à revérifier après cascade.' },
  deck_system: { summary: 'Pioche/défausse/main, effets de cartes.', optimize: 'Mélange Fisher-Yates en place ; cartes en data-driven.' },
  card_effects: { summary: 'Résolution des effets de cartes (dégâts, blocs, statuts).', optimize: 'Table d’effets indexée par id ; pas de switch géant.' },
  stamina_combat: { summary: 'Endurance qui se consomme/régénère ; attaques bloquées si vide.', optimize: 'Mettre à jour l’endurance avec dt, pas par frame fixe.' },
  parry_dodge: { summary: 'Fenêtres de parade/esquive avec i-frames.', optimize: 'Timers en ms ; comparer des intervalles plutôt que compter les frames.' },
  turn_based_battle: { summary: 'Ordre de tour par vitesse, actions, résolution.', optimize: 'File de priorité (tas) pour l’ordre d’initiative.' },
  auto_attack: { summary: 'Attaque automatique de la cible la plus proche.', optimize: 'Grille spatiale (bucket) pour la requête du plus proche.' },
  horde_spawner: { summary: 'Apparition continue d’ennemis en vagues croissantes.', optimize: 'Pool d’ennemis ; budget de spawn par frame.' },
  wave_spawner: { summary: 'Vagues discrètes avec intervalles.', optimize: 'Planifier les vagues par timestamps, pas par compteur de frames.' },
  tower_placement: { summary: 'Placement de tours sur des emplacements valides.', optimize: 'Valider via grille de placement précalculée.' },
  enemy_paths: { summary: 'Suivi de chemin par les ennemis (waypoints).', optimize: 'Précalculer le chemin une fois ; avancer par distance.' },
  idle_production: { summary: 'Production de ressources passive dans le temps.', optimize: 'Calcul en temps écoulé (delta), gérer le hors-ligne.' },
  prestige: { summary: 'Reset avec bonus permanents (méta-progression).', optimize: 'Formules en BigInt si les nombres explosent.' },
  skill_tree: { summary: 'Déblocage de nœuds de compétences avec prérequis.', optimize: 'Graphe en listes d’adjacence ; cache des nœuds débloqués.' },
  loot_system: { summary: 'Génération de butin pondérée par rareté.', optimize: 'Tables de loot data-driven ; tirage cumulatif.' },
};

export function generateSystemScaffold(systemId: string): string {
  const k = SYSTEM_KNOWLEDGE[systemId];
  const fn = `update_${systemId}`;
  return `import type { SimWorld, SimInput } from '@ellipse/engine';

/**
 * Système « ${systemId} » — généré par Ellipse code-gen.
 * ${k ? k.summary : 'TODO: décrire le rôle du système.'}
 *
 * Contrat : muter \`world\` en fonction de \`dtMs\` (delta ms) et \`input\`.
 * Brancher dans la boucle via le registre de systèmes du moteur (gdl.systems).
 */
export function ${fn}(world: SimWorld, dtMs: number, _input: SimInput): void {
  const dt = Math.min(dtMs / 1000, 0.05);
  void dt;
  // TODO(agent): implémenter « ${systemId} ».
  // Optimisation: ${k ? k.optimize : 'préférer le data-driven et éviter les allocations par frame.'}
}
`;
}

export function generateDevBrief(preset: ProductionPreset, plannedSystems: string[]): string {
  const lines = plannedSystems.map((id) => {
    const k = SYSTEM_KNOWLEDGE[id];
    return `- **${id}** — ${k ? k.summary : 'à spécifier'}\n  - Optimisation : ${k ? k.optimize : 'data-driven, sans alloc par frame'}`;
  });
  return `# Brief développeur — ${preset.game_type}

Genre : **${preset.game_type}** · dimension ${preset.dimension} · perspective ${preset.perspective} · difficulté ${preset.difficulty}.
Modules : ${preset.mechanic_modules.join(', ') || '—'}.

## Comment l'IA / les agents travaillent ce projet
1. **Créer** : implémenter chaque système ci-dessous dans \`systems/<id>.ts\` (signature \`update_<id>(world, dtMs, input)\`).
2. **Brancher** : ajouter l'\`id\` du système dans \`game.gdl.json > systems[]\` et l'appeler dans la boucle.
3. **Modifier** : éditer le GDL (entités, layout, paramètres) via les helpers \`@ellipse/shared\` (\`gdl-edit\`).
4. **Optimiser** : suivre les pistes par système ; mesurer via la télémétrie (\`Telemetry\`).
5. **Valider** : harnais runtime headless + gates QA avant preview/export.

## Systèmes à implémenter
${lines.join('\n') || '- (aucun — tous les systèmes requis sont déjà implémentés)'}

## API runtime disponible (\`@ellipse/engine\`)
\`createWorld(gdl)\`, \`stepSimulation(world, dtMs, input)\`, types \`SimWorld\`/\`SimInput\`/\`SimEvent\`.
`;
}

export function generateGameCodeProject(preset: ProductionPreset, opts: StarterGdlOptions = {}): GeneratedProject {
  const plan = resolveLibraryPlan(preset);
  const planned = plan.systems.filter((s) => s.status === 'planned').map((s) => s.id);
  const gdl = buildStarterGdl(preset, opts);

  const files: GeneratedFile[] = [
    { path: 'game.gdl.json', content: JSON.stringify(gdl, null, 2) },
    { path: 'DEV_BRIEF.md', content: generateDevBrief(preset, planned) },
    ...planned.map((id) => ({ path: `systems/${id}.ts`, content: generateSystemScaffold(id) })),
    {
      path: 'project.manifest.json',
      content: JSON.stringify(
        {
          game_type: preset.game_type,
          dimension: preset.dimension,
          mechanic_modules: preset.mechanic_modules,
          planned_systems: planned,
          generated_by: 'ellipse-codegen',
        },
        null,
        2,
      ),
    },
  ];

  return { game_type: preset.game_type, files, planned_systems: planned };
}
