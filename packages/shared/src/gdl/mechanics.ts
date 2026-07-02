import type { GameDefinition } from '../index.js';

type Component = Record<string, unknown>;

function findComponent(components: Component[], key: string): Component | undefined {
  return components.find((c) => key in c);
}

/** Applique les mécaniques détectées par Cortex sur le GDL (sans LLM). */
export function applyMechanics(gdl: GameDefinition, mechanics: string[]): GameDefinition {
  const out = structuredClone(gdl) as GameDefinition & { entities: Record<string, unknown>[] };
  const playerIdx = out.entities.findIndex((e) => e.id === 'player');
  if (playerIdx < 0) return out;

  const player = out.entities[playerIdx]!;
  const components = (player.components as Component[]) ?? [];

  const lower = mechanics.map((m) => m.toLowerCase());

  if (lower.some((m) => m.includes('double jump') || m.includes('double saut'))) {
    let pc = findComponent(components, 'platformer_controller');
    if (!pc) {
      pc = { platformer_controller: {} };
      components.push(pc);
    }
    const existing = (pc.platformer_controller as Record<string, unknown>) ?? {};
    pc.platformer_controller = { ...existing, max_jumps: 2, coyote_time_ms: 120 };
    if (!out.systems.includes('double_jump')) out.systems.push('double_jump');
  }

  if (lower.some((m) => m.includes('collect') || m.includes('score'))) {
    if (!out.systems.includes('collectibles')) out.systems.push('collectibles');
    if (!findComponent(components, 'inventory')) {
      components.push({ inventory: { coins: 0, keys: 0 } });
    }
  }

  if (lower.some((m) => m.includes('enemy') || m.includes('ennemi'))) {
    if (!out.systems.includes('enemy_ai')) out.systems.push('enemy_ai');
    const hasEnemy = out.entities.some((e) => e.id === 'enemy_slime');
    if (!hasEnemy) {
      out.entities.push({
        id: 'enemy_slime',
        type: 'enemy',
        components: [
          { transform: { x: 800, y: 560 } },
          { patrol: { range: 120, speed: 80 } },
          { health: { max: 1, current: 1 } },
        ],
      });
      const scene = out.scenes[0] as { entities?: string[] } | undefined;
      if (scene?.entities && !scene.entities.includes('enemy_slime')) {
        scene.entities.push('enemy_slime');
      }
    }
  }

  if (lower.some((m) => m.includes('health') || m.includes('vie'))) {
    if (!findComponent(components, 'health')) {
      components.push({ health: { max: 3, current: 3 } });
    }
  }

  player.components = components;
  out.entities[playerIdx] = player;
  return out;
}

/** Fusionne un template gameplay en préservant assets joueur déjà générés. */
export function mergeGameplayTemplate(
  current: GameDefinition,
  template: Partial<GameDefinition>,
  mechanics: string[] = [],
): GameDefinition {
  const base = structuredClone(current) as GameDefinition;
  const tpl = structuredClone(template) as Partial<GameDefinition>;

  if (tpl.systems) base.systems = [...new Set([...tpl.systems])];
  if (tpl.meta) base.meta = { ...base.meta, ...tpl.meta, title: base.meta.title };

  const curPlayer = base.entities.find((e) => e.id === 'player');
  const tplPlayer = tpl.entities?.find((e) => e.id === 'player');

  if (tplPlayer || curPlayer) {
    const merged = {
      ...(tplPlayer ?? {}),
      ...(curPlayer ?? {}),
      id: 'player',
      assets: {
        ...((tplPlayer?.assets as object) ?? {}),
        ...((curPlayer?.assets as object) ?? {}),
      },
      components: mergeComponents(
        (tplPlayer?.components as Component[]) ?? [],
        (curPlayer?.components as Component[]) ?? [],
      ),
    };
    const idx = base.entities.findIndex((e) => e.id === 'player');
    if (idx >= 0) base.entities[idx] = merged;
    else base.entities.unshift(merged);
  }

  if (tpl.scenes?.[0]) {
    const curScene = (base.scenes[0] ?? {}) as Record<string, unknown>;
    const tplScene = tpl.scenes[0] as Record<string, unknown>;
    base.scenes[0] = {
      ...tplScene,
      ...curScene,
      background: { ...(tplScene.background as object), ...(curScene.background as object) },
      entities: curScene.entities ?? tplScene.entities ?? ['player'],
    } as (typeof base.scenes)[number];
  }

  if (tpl.ui && !base.ui) base.ui = tpl.ui;

  return applyMechanics(base, mechanics);
}

function mergeComponents(tpl: Component[], cur: Component[]): Component[] {
  const map = new Map<string, Component>();
  for (const c of tpl) {
    const key = Object.keys(c)[0];
    if (key) map.set(key, structuredClone(c));
  }
  for (const c of cur) {
    const key = Object.keys(c)[0];
    if (!key) continue;
    const prev = map.get(key);
    map.set(key, prev ? { ...prev, ...c } : structuredClone(c));
  }
  return [...map.values()];
}
