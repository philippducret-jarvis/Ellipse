/**
 * Édition GDL bidirectionnelle (Lot 7) — cœur d'écriture du studio.
 *
 * Opérations **pures** (renvoient un nouveau GDL valide) que l'UI appelle pour écrire dans
 * les contrats canoniques : placer/déplacer entités & plateformes, régler des composants,
 * poser des triggers (transitions de scène). Garantit le round-trip GDL→édition→GDL.
 */
import { GameDefinitionSchema, type GameDefinition } from '../index.js';
import type { GameComponent } from './ir.js';

function clone(gdl: GameDefinition): GameDefinition {
  return structuredClone(gdl);
}

/** Normalise un GDL brut avant parse Zod (champs layout optionnels manquants, etc.). */
export function normalizeGdlForParse(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const gdl = structuredClone(raw) as {
    scenes?: Array<{ layout?: Record<string, unknown> }>;
  };
  for (const scene of gdl.scenes ?? []) {
    if (!scene.layout || typeof scene.layout !== 'object') continue;
    if (!Array.isArray(scene.layout.collectibles)) scene.layout.collectibles = [];
    if (!Array.isArray(scene.layout.platforms)) scene.layout.platforms = [];
  }
  return gdl;
}

/** Ajoute une entité à une scène (et à la liste globale si absente). */
export function addEntityToScene(
  gdl: GameDefinition,
  sceneId: string,
  entity: { id: string; type?: string; assets?: Record<string, unknown>; components?: GameComponent[] },
): GameDefinition {
  const out = clone(gdl);
  if (!out.entities.some((e) => e.id === entity.id)) {
    out.entities.push({ id: entity.id, type: entity.type, assets: entity.assets, components: entity.components ?? [] });
  }
  const scene = out.scenes.find((s) => s.id === sceneId);
  if (scene && !scene.entities.includes(entity.id)) scene.entities.push(entity.id);
  return GameDefinitionSchema.parse(out);
}

/** Met à jour (merge) un composant d'une entité par clé (transform, physics, health, …). */
export function setEntityComponent(
  gdl: GameDefinition,
  entityId: string,
  key: string,
  value: Record<string, unknown>,
): GameDefinition {
  const out = clone(gdl);
  const entity = out.entities.find((e) => e.id === entityId);
  if (!entity) throw new Error(`Entité introuvable: ${entityId}`);
  const comps = (entity.components ??= []);
  const existing = comps.find((c) => key in c);
  if (existing) existing[key] = { ...(existing[key] as object), ...value };
  else comps.push({ [key]: value } as GameComponent);
  return GameDefinitionSchema.parse(out);
}

/** Ajoute une plateforme au layout d'une scène. */
export function addPlatform(
  gdl: GameDefinition,
  sceneId: string,
  platform: { x: number; y: number; w: number; h: number; type?: 'ground' | 'platform' | 'moving' },
): GameDefinition {
  const out = clone(gdl);
  const scene = out.scenes.find((s) => s.id === sceneId);
  if (!scene?.layout) throw new Error(`Scène/layout introuvable: ${sceneId}`);
  scene.layout.platforms.push({ x: platform.x, y: platform.y, w: platform.w, h: platform.h, type: platform.type ?? 'platform' });
  return GameDefinitionSchema.parse(out);
}

/** Déplace la n-ième plateforme d'une scène. */
export function movePlatform(
  gdl: GameDefinition,
  sceneId: string,
  index: number,
  pos: { x: number; y: number },
): GameDefinition {
  const out = clone(gdl);
  const plat = out.scenes.find((s) => s.id === sceneId)?.layout?.platforms[index];
  if (!plat) throw new Error(`Plateforme introuvable: ${sceneId}[${index}]`);
  plat.x = pos.x;
  plat.y = pos.y;
  return GameDefinitionSchema.parse(out);
}

/** Pose un trigger de transition vers une autre scène (au goal par défaut). */
export function addSceneTransition(
  gdl: GameDefinition,
  fromSceneId: string,
  toSceneId: string,
  trigger = 'goal',
): GameDefinition {
  const out = clone(gdl);
  const scene = out.scenes.find((s) => s.id === fromSceneId);
  if (!scene) throw new Error(`Scène introuvable: ${fromSceneId}`);
  (scene.transitions ??= []).push({ trigger, to_scene: toSceneId });
  return GameDefinitionSchema.parse(out);
}
