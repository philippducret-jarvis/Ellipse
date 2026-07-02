/**
 * Pool ennemis dynamique — resync quand world.enemies change (vagues Veloria).
 */
import { Assets, Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { SimEnemy } from '../sim/world.js';

export interface EnemyPoolEntry {
  sprite: Sprite | null;
  gfx: Graphics | null;
}

export interface EnemyPoolState {
  entries: EnemyPoolEntry[];
  fingerprint: string;
  textureCache: Map<string, Texture>;
}

export function enemyFingerprint(enemies: SimEnemy[]): string {
  return enemies.map((e, i) => `${i}:${e.kind}:${e.alive}:${e.x}:${e.y}`).join('|');
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
): Promise<void> {
  const fp = enemyFingerprint(enemies);
  if (fp === state.fingerprint) return;

  clearEnemyPool(world, state);
  state.fingerprint = fp;

  for (const enemy of enemies) {
    const kind = enemy.kind ?? 'enemy';
    const url = atlas[kind];
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
        sprite.width = enemy.width;
        sprite.height = enemy.height;
        sprite.x = enemy.x;
        sprite.y = enemy.y;
        world.addChild(sprite);
        state.entries.push({ sprite, gfx: null });
        continue;
      }
    }
    const gfx = new Graphics();
    gfx.rect(0, 0, enemy.width, enemy.height);
    gfx.fill(enemy.isBoss ? 0x9333ea : 0xe94560);
    gfx.x = enemy.x;
    gfx.y = enemy.y;
    world.addChild(gfx);
    state.entries.push({ sprite: null, gfx });
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
      entry.sprite.x = enemy.x;
      entry.sprite.y = enemy.y;
      entry.sprite.scale.set(pers);
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
