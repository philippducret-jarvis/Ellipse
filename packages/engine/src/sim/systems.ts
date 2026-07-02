/**
 * Systèmes de simulation pluggables (ECS-lite), purs et sans rendu.
 *
 * `stepSimulation` orchestre une frame. Le mode de déplacement est **piloté par les données** :
 *   - `physics_topdown` dans `gdl.systems[]` → déplacement 8 directions, sans gravité (Lot 1E)
 *   - sinon → platformer (gravité + collisions), fidèle à l'engine historique (parité Lot 1B)
 *
 * Les sous-systèmes (collectibles, goal, ennemis, hazards, santé) s'exécutent si activés ;
 * par défaut ils sont actifs (rétro-compatibilité avec les GDL existants).
 */
import type { SimWorld, SimInput, SimAABB, SimEvent } from './world.js';
import { applyScene, nextSceneIndex } from './world.js';
import { stepVeloriaSurvival } from './veloria-survival.js';

const MAX_DT = 0.05;

function overlap(a: SimAABB, b: SimAABB): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function playerBox(w: SimWorld): SimAABB {
  return { x: w.player.x, y: w.player.y, w: w.player.width, h: w.player.height };
}

function has(world: SimWorld, system: string): boolean {
  return world.systems.includes(system);
}

/** Un système gameplay donné est-il actif ? Actif par défaut si aucun système n'est déclaré. */
function active(world: SimWorld, ...aliases: string[]): boolean {
  if (world.systems.length === 0) return true;
  return aliases.some((a) => world.systems.includes(a));
}

function showMessage(world: SimWorld, msg: string, durationMs = 2000): void {
  world.message = msg;
  world.messageTimer = durationMs;
}

function emit(world: SimWorld, type: SimEvent['type'], x?: number, y?: number, data?: Record<string, unknown>): void {
  world.events.push({ type, x, y, data });
}

function takeDamage(world: SimWorld): void {
  const p = world.player;
  if (p.invincibleMs > 0) return;
  p.health -= 1;
  p.invincibleMs = 1500;
  emit(world, 'damage', p.x, p.y, { health: p.health });
  if (p.health <= 0) {
    world.gameOver = true;
    emit(world, 'lose', p.x, p.y);
    showMessage(world, 'Game Over', 99999);
  }
}

const isTopdown = (world: SimWorld): boolean => has(world, 'physics_topdown');

/** Replace le joueur au dernier checkpoint atteint, sinon au spawn par défaut. */
export function respawnPlayer(world: SimWorld): void {
  const cp = world.lastCheckpoint;
  world.player.x = cp ? cp.x : 100;
  world.player.y = cp ? cp.y : world.worldHeight - 200;
  world.player.vy = 0;
}

/**
 * Avance la simulation d'une frame. `dtMs` = delta réel (ms). Renvoie le monde muté.
 * Le caller gère le restart (espace) quand `gameOver`/`levelWon`.
 */
export function stepSimulation(world: SimWorld, dtMs: number, input: SimInput): SimWorld {
  if (world.gameOver || world.levelWon) return world;
  world.events = [];
  const dt = Math.min(dtMs / 1000, MAX_DT);
  const p = world.player;
  const veloriaActive = world.veloria != null && has(world, 'lane_runner');

  if (!veloriaActive) {
    if (isTopdown(world)) {
      stepTopdown(world, dt, input);
    } else {
      stepPlatformer(world, dt, input);
    }
  }

  if (veloriaActive) {
    stepVeloriaSurvival(world, dtMs, input);
  } else if (active(world, 'enemy_ai')) {
    updateEnemies(world, dt);
  }

  // ── Collectibles ──
  if (active(world, 'collectibles')) {
    for (const col of world.collectibles) {
      if (col.collected) continue;
      if (overlap(playerBox(world), { x: col.x, y: col.y, w: col.width, h: col.height })) {
        col.collected = true;
        p.score += 50;
        emit(world, 'collect', col.x, col.y, { type: col.type });
        showMessage(world, '+50', 600);
      }
    }
  }

  // ── Hazards (nouveau : l'engine historique les ignorait) ──
  if (active(world, 'hazards')) {
    for (const hz of world.hazards) {
      if (p.invincibleMs <= 0 && overlap(playerBox(world), hz)) takeDamage(world);
    }
  }

  // ── Checkpoints ──
  for (const cp of world.checkpoints) {
    if (cp.reached) continue;
    const box: SimAABB = { x: cp.x - 16, y: cp.y - 32, w: 32, h: 64 };
    if (overlap(playerBox(world), box)) {
      cp.reached = true;
      world.lastCheckpoint = { x: cp.x, y: cp.y };
      emit(world, 'checkpoint', cp.x, cp.y, { label: cp.label });
      showMessage(world, `Checkpoint : ${cp.label}`, 1200);
    }
  }

  // ── Goal → transition de scène (multi-scènes) ou victoire ──
  if (world.goal && active(world, 'goal')) {
    if (overlap(playerBox(world), world.goal)) {
      const next = nextSceneIndex(world);
      if (next >= 0) {
        applyScene(world, next); // préserve health/score
        world.sceneJustChanged = true;
        emit(world, 'scene_change', undefined, undefined, { scene: world.sceneId });
        showMessage(world, `Scène : ${world.sceneId}`, 1500);
      } else {
        world.levelWon = true;
        emit(world, 'win', p.x, p.y, { score: p.score });
        showMessage(world, `Level Complete! Score: ${p.score}`, 99999);
      }
    }
  }

  // ── Invincibilité + message ──
  if (p.invincibleMs > 0) p.invincibleMs -= dtMs;
  if (world.messageTimer > 0) {
    world.messageTimer -= dtMs;
    if (world.messageTimer <= 0 && !world.gameOver && !world.levelWon) world.message = '';
  }

  return world;
}

function stepPlatformer(world: SimWorld, dt: number, input: SimInput): void {
  const p = world.player;

  if (input.left) {
    p.vx = -world.moveSpeed;
    p.facing = -1;
  } else if (input.right) {
    p.vx = world.moveSpeed;
    p.facing = 1;
  } else {
    p.vx = 0;
  }

  if (input.jump) {
    const canDouble = has(world, 'double_jump');
    if (p.grounded) {
      p.vy = -world.jumpForce;
      p.grounded = false;
      p.airJumps = 0;
      emit(world, 'jump', p.x, p.y);
    } else if (canDouble && (p.airJumps ?? 0) < 1) {
      p.vy = -world.jumpForce;
      p.airJumps = (p.airJumps ?? 0) + 1;
      emit(world, 'jump', p.x, p.y, { double: true });
    }
  }

  // Intégration
  p.vy += world.gravity * dt;
  p.x += p.vx * dt;
  p.y += p.vy * dt;

  // Collisions plateformes (atterrissage par le dessus)
  p.grounded = false;
  for (const plat of world.platforms) {
    const prevBottom = p.y + p.height - p.vy * dt;
    if (
      p.x + p.width > plat.x &&
      p.x < plat.x + plat.w &&
      p.y + p.height >= plat.y &&
      prevBottom <= plat.y + 4
    ) {
      p.y = plat.y - p.height;
      p.vy = 0;
      p.grounded = true;
    }
  }

  // Bornes du monde
  p.x = Math.max(0, Math.min(world.worldWidth - p.width, p.x));
  if (p.y > world.worldHeight + 100) {
    takeDamage(world);
    respawnPlayer(world);
  }
}

function stepTopdown(world: SimWorld, dt: number, input: SimInput): void {
  const p = world.player;
  const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  // Normalisation diagonale
  const len = Math.hypot(dx, dy) || 1;
  p.vx = (dx / len) * world.moveSpeed;
  p.vy = (dy / len) * world.moveSpeed;
  if (dx < 0) p.facing = -1;
  else if (dx > 0) p.facing = 1;

  const nextX = p.x + p.vx * dt;
  const nextY = p.y + p.vy * dt;

  // Plateformes = blockers solides (résolution par axe)
  const blockedX = world.platforms.some((plat) =>
    overlap({ x: nextX, y: p.y, w: p.width, h: p.height }, { x: plat.x, y: plat.y, w: plat.w, h: plat.h }),
  );
  const blockedY = world.platforms.some((plat) =>
    overlap({ x: p.x, y: nextY, w: p.width, h: p.height }, { x: plat.x, y: plat.y, w: plat.w, h: plat.h }),
  );
  if (!blockedX) p.x = nextX;
  if (!blockedY) p.y = nextY;

  p.x = Math.max(0, Math.min(world.worldWidth - p.width, p.x));
  p.y = Math.max(0, Math.min(world.worldHeight - p.height, p.y));
  p.grounded = true;
}

function updateEnemies(world: SimWorld, dt: number): void {
  const p = world.player;
  for (const enemy of world.enemies) {
    if (!enemy.alive) continue;
    enemy.x += enemy.vx * dt;
    if (enemy.x <= enemy.patrolLeft) {
      enemy.x = enemy.patrolLeft;
      enemy.vx = Math.abs(enemy.vx);
    }
    if (enemy.x >= enemy.patrolRight) {
      enemy.x = enemy.patrolRight;
      enemy.vx = -Math.abs(enemy.vx);
    }

    const eBox: SimAABB = { x: enemy.x, y: enemy.y, w: enemy.width, h: enemy.height };
    if (p.invincibleMs <= 0 && overlap(playerBox(world), eBox)) {
      // Saut sur la tête = élimination + rebond
      if (!isTopdown(world) && p.vy > 0 && p.y + p.height < enemy.y + enemy.height * 0.5) {
        enemy.alive = false;
        p.vy = -world.jumpForce * 0.7;
        p.score += 100;
        emit(world, 'enemy_killed', enemy.x, enemy.y);
        showMessage(world, '+100 !', 800);
      } else {
        takeDamage(world);
      }
    }
  }
}
