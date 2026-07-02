/**
 * Y-sort dynamique — parité Godot YSort / Phaser sprite.setDepth(feetY).
 */
import type { Container } from 'pixi.js';
import {
  computeSortKey,
  feetY,
  type DepthSpec,
  type EntityDepth,
} from '@ellipse/shared';

export interface SortableEntity {
  display: Container;
  x: number;
  y: number;
  width: number;
  height: number;
  depth?: EntityDepth | null;
  visible?: boolean;
}

export function resolveFeetOffset(
  entityDepth: EntityDepth | null | undefined,
  sceneDefault?: number,
): number {
  return entityDepth?.feet_offset ?? sceneDefault ?? 0.92;
}

export function sortKeyForEntity(
  entity: SortableEntity,
  depthSpec?: DepthSpec,
  sceneFeetOffset?: number,
): number {
  const offset = resolveFeetOffset(entity.depth, sceneFeetOffset ?? depthSpec?.feet_offset);
  const fy = feetY(entity.y, entity.height, offset);
  const bias = entity.depth?.sort_bias ?? 0;
  return computeSortKey(fy, entity.x + entity.width / 2, depthSpec, bias);
}

/** Applique zIndex Pixi sur chaque display selon sort_key (plus grand = devant). */
export function applyDepthSort(entities: SortableEntity[], depthSpec?: DepthSpec): void {
  for (const e of entities) {
    if (e.visible === false) {
      e.display.visible = false;
      continue;
    }
    e.display.visible = true;
    e.display.zIndex = sortKeyForEntity(e, depthSpec);
  }
}

/** Conteneur avec sortableChildren (Pixi 8). */
export function ensureSortableContainer(container: Container): void {
  container.sortableChildren = true;
}
