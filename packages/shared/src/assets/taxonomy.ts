/**
 * Taxonomie canonique des assets Ellipse.
 * Source unique — synchroniser vers tools/lib/production-hq/catalog.mjs et workspaces registry.
 */
import type { AgentType } from '../agents/catalog.js';
import {
  GAME_ASSET_KIND,
  GAME_ASSET_ROLE,
  GameAssetKindSchema,
  GameAssetRoleSchema,
} from '../game-factory.js';
import type { z } from 'zod';

type GameAssetKind = z.infer<typeof GameAssetKindSchema>;
type GameAssetRole = z.infer<typeof GameAssetRoleSchema>;

export const ASSET_GROUPS = ['characters', 'props', 'environments', 'ui', 'audio', 'fx'] as const;
export type AssetGroup = (typeof ASSET_GROUPS)[number];

export interface AssetFamily {
  id: string;
  label: string;
  labelFr: string;
  group: AssetGroup;
  roles: readonly GameAssetRole[];
  kinds: readonly GameAssetKind[];
  runtimeUse: readonly string[];
  folderPattern: string;
}

/** 11 familles — jamais mélanger hero/enemy/boss dans le même dossier */
export const ASSET_FAMILIES: readonly AssetFamily[] = [
  {
    id: 'heroes',
    label: 'Heroes',
    labelFr: 'Héros jouables',
    group: 'characters',
    roles: ['hero'],
    kinds: ['character', 'sprite', 'portrait', 'model', 'animation'],
    runtimeUse: ['playable avatar', 'combat state machine', 'inventory and codex portrait'],
    folderPattern: '03_assets/characters/hero__<slug>',
  },
  {
    id: 'companions_and_allies',
    label: 'Companions, allies, guides, merchants',
    labelFr: 'Compagnons, alliés, PNJ',
    group: 'characters',
    roles: ['companion', 'ally', 'guide', 'merchant', 'npc'],
    kinds: ['character', 'portrait', 'animation', 'voice'],
    runtimeUse: ['dialogue', 'quest handoff', 'ambient world life', 'shop and support'],
    folderPattern: '03_assets/characters/<role>__<slug>',
  },
  {
    id: 'enemies',
    label: 'Enemies and monsters',
    labelFr: 'Ennemis et monstres',
    group: 'characters',
    roles: ['enemy', 'monster', 'summon', 'mount'],
    kinds: ['character', 'sprite', 'animation'],
    runtimeUse: ['combat', 'patrol', 'encounter composition'],
    folderPattern: '03_assets/characters/<role>__<slug>',
  },
  {
    id: 'bosses',
    label: 'Bosses',
    labelFr: 'Boss',
    group: 'characters',
    roles: ['boss'],
    kinds: ['character', 'sprite', 'model', 'animation', 'fx'],
    runtimeUse: ['phase combat', 'arena scripting', 'cinematic staging'],
    folderPattern: '03_assets/characters/boss__<slug>',
  },
  {
    id: 'weapons_and_relics',
    label: 'Weapons, armor, relics',
    labelFr: 'Armes, armures, reliques',
    group: 'props',
    roles: ['weapon', 'armor', 'relic'],
    kinds: ['prop', 'sprite', 'model', 'fx'],
    runtimeUse: ['equipables', 'choice altars', 'upgrade trees'],
    folderPattern: '03_assets/props/<role>__<slug>',
  },
  {
    id: 'interaction_props',
    label: 'Checkpoints, doors, portals, altars, props',
    labelFr: 'Props interactifs',
    group: 'props',
    roles: ['prop', 'checkpoint', 'door', 'portal', 'altar'],
    kinds: ['prop', 'sprite', 'fx', 'audio'],
    runtimeUse: ['progression anchors', 'save points', 'travel', 'interactions'],
    folderPattern: '03_assets/props/<role>__<slug>',
  },
  {
    id: 'hazards_and_pickups',
    label: 'Hazards, traps, pickups, collectibles',
    labelFr: 'Pièges et collectibles',
    group: 'props',
    roles: ['hazard', 'trap', 'pickup', 'collectible'],
    kinds: ['prop', 'sprite', 'fx', 'audio'],
    runtimeUse: ['challenge cadence', 'reward loop', 'feedback'],
    folderPattern: '03_assets/props/<role>__<slug>',
  },
  {
    id: 'biomes_and_maps',
    label: 'Biomes, maps, tilesets, backgrounds',
    labelFr: 'Cartes, biomes, tilesets',
    group: 'environments',
    roles: ['environment', 'biome', 'background', 'tileset'],
    kinds: ['environment', 'tileset', 'sprite', 'material'],
    runtimeUse: ['level kit', 'parallax', 'collision shell', 'world navigation'],
    folderPattern: '03_assets/environments/<role>__<slug>',
  },
  {
    id: 'ui_shells',
    label: 'UI, HUD, menus, codex',
    labelFr: 'Interface et HUD',
    group: 'ui',
    roles: ['ui'],
    kinds: ['ui', 'sprite', 'portrait', 'animation'],
    runtimeUse: ['menus', 'hud', 'codex', 'dialogue panels'],
    folderPattern: '03_assets/ui/ui__<slug>',
  },
  {
    id: 'sound_and_voice',
    label: 'Music, SFX, voice',
    labelFr: 'Musique, SFX, voix',
    group: 'audio',
    roles: ['music', 'sfx', 'voice'],
    kinds: ['audio', 'music', 'voice'],
    runtimeUse: ['bgm states', 'stingers', 'foley', 'dialogue'],
    folderPattern: '03_assets/audio/<role>__<slug>',
  },
  {
    id: 'fx_feedback',
    label: 'Combat and ambient FX',
    labelFr: 'Effets visuels',
    group: 'fx',
    roles: ['fx'],
    kinds: ['fx', 'sprite', 'animation'],
    runtimeUse: ['combat juice', 'ambient spores', 'UI feedback', 'world corruption'],
    folderPattern: '03_assets/fx/fx__<slug>',
  },
] as const;

export const ALL_ASSET_ROLES = GAME_ASSET_ROLE;
export const ALL_ASSET_KINDS = GAME_ASSET_KIND;

export function getFamilyById(id: string): AssetFamily | undefined {
  return ASSET_FAMILIES.find((f) => f.id === id);
}

export function getFamilyForRole(role: GameAssetRole): AssetFamily | undefined {
  return ASSET_FAMILIES.find((f) => (f.roles as readonly string[]).includes(role));
}

export function resolveAssetFolder(role: GameAssetRole, slug: string): string {
  const family = getFamilyForRole(role);
  if (!family) throw new Error(`Rôle asset inconnu: ${role}`);
  return family.folderPattern
    .replace('<role>', role)
    .replace('<slug>', slug)
    .replace('hero__<slug>', `hero__${slug}`);
}

export function validateRoleKindPair(role: GameAssetRole, kind: GameAssetKind): boolean {
  const family = getFamilyForRole(role);
  if (!family) return false;
  return (family.roles as readonly string[]).includes(role) && (family.kinds as readonly string[]).includes(kind);
}

/** Mapping factory agents (production HQ) → runtime agents (GDL) */
export const FACTORY_TO_RUNTIME_AGENT: Record<string, AgentType[]> = {
  asset_direction: ['character', 'decor', 'ui', 'vfx'],
  animation: ['animation'],
  level_design: ['level', 'camera', 'lighting'],
  gameplay_programming: ['gameplay'],
  narrative: ['narrative'],
  qa: ['qa'],
  build_release: ['integration'],
};
