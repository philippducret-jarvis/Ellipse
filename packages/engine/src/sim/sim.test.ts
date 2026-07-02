import { describe, it, expect } from 'vitest';
import { GameDefinitionSchema, type GameDefinition } from '@ellipse/shared';
import { createWorld, type SimInput } from './world.js';
import { stepSimulation } from './systems.js';

const NO_INPUT: SimInput = { left: false, right: false, jump: false };

function makeGdl(partial: Partial<GameDefinition> = {}): GameDefinition {
  return GameDefinitionSchema.parse({
    meta: { title: 'Test', dimension: '2d', genre: 'platformer', resolution: [1280, 720], version: '1' },
    systems: ['input', 'platformer_physics', 'collectibles', 'enemy_ai', 'goal', 'hazards'],
    entities: [
      {
        id: 'player',
        type: 'character',
        components: [
          { transform: { x: 100, y: 100 } },
          { physics: { body: 'dynamic', gravity: 980 } },
          { platformer_controller: { move_speed: 220, jump_force: 420 } },
          { health: { max: 3, current: 3 } },
        ],
      },
    ],
    scenes: [
      {
        id: 'level_01',
        entities: ['player'],
        layout: {
          width: 1280,
          height: 720,
          ground_y: 640,
          spawn: { x: 100, y: 100 },
          platforms: [{ x: 0, y: 640, w: 1280, h: 80, type: 'ground' }],
          collectibles: [],
          goal: { x: 1160, y: 576 },
        },
      },
    ],
    ...partial,
  });
}

function tick(world: ReturnType<typeof createWorld>, frames: number, input: SimInput = NO_INPUT, dtMs = 16) {
  for (let i = 0; i < frames; i++) stepSimulation(world, dtMs, input);
}

describe('sim — gravité & atterrissage (parité platformer)', () => {
  it('le joueur tombe puis se pose sur le sol', () => {
    const w = createWorld(makeGdl());
    expect(w.player.grounded).toBe(false);
    tick(w, 120);
    expect(w.player.grounded).toBe(true);
    expect(w.player.y).toBeCloseTo(640 - w.player.height, 0); // posé sur le sol
  });

  it('se déplace à droite avec l’input', () => {
    const w = createWorld(makeGdl());
    tick(w, 60); // poser au sol
    const x0 = w.player.x;
    tick(w, 30, { left: false, right: true, jump: false });
    expect(w.player.x).toBeGreaterThan(x0);
    expect(w.player.facing).toBe(1);
  });
});

describe('sim — entités data-driven', () => {
  it('engendre 3 ennemis par défaut pour un platformer', () => {
    expect(createWorld(makeGdl()).enemies).toHaveLength(3);
  });

  it('lit les ennemis depuis le layout quand fournis', () => {
    const gdl = makeGdl();
    gdl.scenes[0]!.layout!.enemies = [{ x: 300, y: 600, speed: 50, patrol: 40 }];
    const w = createWorld(gdl);
    expect(w.enemies).toHaveLength(1);
    expect(w.enemies[0]!.vx).toBe(50);
  });
});

describe('sim — collectibles, goal, hazards, ennemis', () => {
  it('ramasse un collectible (+50)', () => {
    const gdl = makeGdl();
    gdl.scenes[0]!.layout!.collectibles = [{ x: 132, y: 600, type: 'coin' }];
    const w = createWorld(gdl);
    tick(w, 120);
    expect(w.collectibles[0]!.collected).toBe(true);
    expect(w.player.score).toBeGreaterThanOrEqual(50);
  });

  it('gagne en atteignant le goal', () => {
    const w = createWorld(makeGdl());
    w.player.x = 1160;
    w.player.y = 576;
    stepSimulation(w, 16, NO_INPUT);
    expect(w.levelWon).toBe(true);
  });

  it('un hazard inflige des dégâts', () => {
    const gdl = makeGdl();
    gdl.scenes[0]!.layout!.hazards = [{ x: 90, y: 90, w: 80, h: 80, kind: 'spikes' }];
    const w = createWorld(gdl);
    const hp0 = w.player.health;
    stepSimulation(w, 16, NO_INPUT); // joueur spawn 100,100 chevauche le hazard
    expect(w.player.health).toBe(hp0 - 1);
  });

  it('écrase un ennemi par le dessus (+100)', () => {
    const w = createWorld(makeGdl());
    w.enemies = [
      { x: 100, y: 200, vx: 0, width: 40, height: 40, alive: true, patrolLeft: 100, patrolRight: 100 },
    ];
    w.player.x = 100;
    w.player.y = 150;
    w.player.vy = 200; // tombe sur l'ennemi
    stepSimulation(w, 16, NO_INPUT);
    expect(w.enemies[0]!.alive).toBe(false);
    expect(w.player.score).toBeGreaterThanOrEqual(100);
  });
});

describe('sim — multi-scènes & checkpoints (Lot 1D)', () => {
  function twoSceneGdl(): GameDefinition {
    const gdl = makeGdl();
    // scène 1 : goal proche du spawn pour transition immédiate
    gdl.scenes[0]!.layout!.goal = { x: 130, y: 90 };
    gdl.scenes[0]!.transitions = [{ trigger: 'goal', to_scene: 'level_02' }];
    gdl.scenes.push({
      id: 'level_02',
      entities: ['player'],
      layout: {
        width: 1280,
        height: 720,
        ground_y: 640,
        spawn: { x: 50, y: 100 },
        platforms: [{ x: 0, y: 640, w: 1280, h: 80, type: 'ground' }],
        collectibles: [],
        goal: { x: 1200, y: 576 },
      },
    } as GameDefinition['scenes'][number]);
    return GameDefinitionSchema.parse(gdl);
  }

  it('atteindre le goal charge la scène suivante au lieu de gagner', () => {
    const w = createWorld(twoSceneGdl());
    expect(w.sceneCount).toBe(2);
    w.player.x = 130;
    w.player.y = 90;
    stepSimulation(w, 16, NO_INPUT);
    expect(w.levelWon).toBe(false);
    expect(w.sceneIndex).toBe(1);
    expect(w.sceneId).toBe('level_02');
    expect(w.sceneJustChanged).toBe(true);
  });

  it('préserve le score à la transition de scène', () => {
    const w = createWorld(twoSceneGdl());
    w.player.score = 250;
    w.player.x = 130;
    w.player.y = 90;
    stepSimulation(w, 16, NO_INPUT);
    expect(w.player.score).toBe(250);
  });

  it('respawn au dernier checkpoint après une chute', () => {
    const gdl = makeGdl();
    gdl.scenes[0]!.layout!.checkpoints = [{ x: 700, y: 600, label: 'Mi-parcours' }];
    const w = createWorld(GameDefinitionSchema.parse(gdl));
    w.player.x = 700;
    w.player.y = 600;
    stepSimulation(w, 16, NO_INPUT); // atteint le checkpoint
    expect(w.lastCheckpoint).toEqual({ x: 700, y: 600 });
    // chute hors du monde
    w.player.y = w.worldHeight + 200;
    stepSimulation(w, 16, NO_INPUT);
    expect(w.player.x).toBe(700); // respawn au checkpoint, pas au spawn par défaut
  });
});

describe('sim — game-feel events (Lot 8)', () => {
  it('émet collect et enemy_killed', () => {
    const gdl = makeGdl();
    gdl.scenes[0]!.layout!.collectibles = [{ x: 132, y: 600, type: 'spore' }];
    const w = createWorld(gdl);
    tick(w, 120);
    const collected = w.collectibles[0]!.collected;
    expect(collected).toBe(true);

    // stomp
    w.enemies = [{ x: 100, y: 200, vx: 0, width: 40, height: 40, alive: true, patrolLeft: 100, patrolRight: 100 }];
    w.player.x = 100;
    w.player.y = 150;
    w.player.vy = 200;
    stepSimulation(w, 16, NO_INPUT);
    expect(w.events.some((e) => e.type === 'enemy_killed')).toBe(true);
  });

  it('vide les events à chaque frame', () => {
    const w = createWorld(makeGdl());
    stepSimulation(w, 16, { left: false, right: false, jump: true });
    const after1 = w.events.length;
    stepSimulation(w, 16, NO_INPUT);
    // events réinitialisés (pas d'accumulation infinie)
    expect(w.events.length).toBeLessThanOrEqual(after1 + 1);
  });
});

describe('sim — genre top-down (Lot 1E)', () => {
  it('pas de gravité, déplacement vertical piloté par input', () => {
    const gdl = makeGdl({ systems: ['input', 'physics_topdown'] });
    const w = createWorld(gdl);
    const y0 = w.player.y;
    tick(w, 30); // sans input : ne tombe pas
    expect(w.player.y).toBe(y0);
    tick(w, 30, { left: false, right: false, jump: false, down: true });
    expect(w.player.y).toBeGreaterThan(y0);
  });
});
