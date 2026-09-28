/**
 * Pool ennemis dynamique — resync quand world.enemies change (vagues Veloria).
 */
import { Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { SimEnemy } from '../sim/world.js';

export interface EnemyPoolEntry {
  sprite: Sprite | null;
  gfx: Graphics | null;
  baseScaleX: number;
  baseScaleY: number;
  renderWidth: number;
  renderHeight: number;
}

export interface EnemyRenderProfile {
  width?: number;
  height?: number;
}

export interface EnemyPoolState {
  entries: EnemyPoolEntry[];
  fingerprint: string;
  textureCache: Map<string, Texture>;
}

export function enemyFingerprint(enemies: SimEnemy[]): string {
  // La position change à chaque frame : elle ne doit jamais provoquer un
  // rechargement des textures. Le pool ne se reconstruit que si sa composition
  // (ordre, famille, boss/variant) change réellement.
  return enemies.map((enemy, index) => `${index}:${enemy.kind}:${enemy.isBoss ? 'boss' : 'mob'}:${enemy.variant ?? ''}`).join('|');
}

export function clearEnemyPool(world: Container, state: EnemyPoolState): void {
  for (const entry of state.entries) {
    entry.sprite?.destroy();
    entry.gfx?.destroy();
  }
  state.entries = [];
  state.fingerprint = '';
}

export async function syncEnemyPool(
  world: Container,
  enemies: SimEnemy[],
  atlas: Record<string, string>,
  state: EnemyPoolState,
  renderProfiles: Record<string, EnemyRenderProfile> = {},
): Promise<void> {
  const fp = enemyFingerprint(enemies);
  if (fp === state.fingerprint) return;

  clearEnemyPool(world, state);
  state.fingerprint = fp;

  for (const enemy of enemies) {
    const kind = enemy.kind ?? 'enemy';
    const url = atlas[kind];
    const profile = renderProfiles[kind] ?? {};
    const renderWidth = Math.max(1, profile.width ?? enemy.width);
    const renderHeight = Math.max(1, profile.height ?? enemy.height);
    if (url && !url.includes('placeholder')) {
      let tex = state.textureCache.get(url);
      if (!tex) {
        try {
          tex = await Assets.load<Texture>(url);
          state.textureCache.set(url, tex);
        } catch {
          tex = undefined;
        }
      }
      if (tex) {
        const sprite = new Sprite(tex);
        sprite.width = renderWidth;
        sprite.height = renderHeight;
        sprite.x = enemy.x + enemy.width / 2 - renderWidth / 2;
        sprite.y = enemy.y + enemy.height - renderHeight;
        world.addChild(sprite);
        state.entries.push({
          sprite,
          gfx: null,
          baseScaleX: sprite.scale.x,
          baseScaleY: sprite.scale.y,
          renderWidth,
          renderHeight,
        });
        continue;
      }
    }
    const gfx = new Graphics();
    gfx.rect(0, 0, enemy.width, enemy.height);
    gfx.fill(enemy.isBoss ? 0x9333ea : 0xe94560);
    gfx.x = enemy.x;
    gfx.y = enemy.y;
    world.addChild(gfx);
    state.entries.push({
      sprite: null,
      gfx,
      baseScaleX: 1,
      baseScaleY: 1,
      renderWidth: enemy.width,
      renderHeight: enemy.height,
    });
  }
}

export function updateEnemyPoolDisplays(
  enemies: SimEnemy[],
  state: EnemyPoolState,
  perspectiveScale: (y: number, h: number) => number,
): EnemyPoolEntry[] {
  const out: EnemyPoolEntry[] = [];
  for (let i = 0; i < state.entries.length; i++) {
    const enemy = enemies[i];
    const entry = state.entries[i];
    if (!enemy || !entry) continue;
    const pers = perspectiveScale(enemy.y, enemy.height);
    if (entry.sprite) {
      entry.sprite.visible = enemy.alive;
      entry.sprite.x = enemy.x + enemy.width / 2 - entry.renderWidth * pers / 2;
      entry.sprite.y = enemy.y + enemy.height - entry.renderHeight * pers;
      entry.sprite.scale.set(entry.baseScaleX * pers, entry.baseScaleY * pers);
    } else if (entry.gfx) {
      entry.gfx.visible = enemy.alive;
      entry.gfx.x = enemy.x;
      entry.gfx.y = enemy.y;
      entry.gfx.scale.set(pers);
    }
    out.push(entry);
  }
  return out;
}
