/**
 * LOGIQUE DE JEU PURE — aucun DOM, aucun canvas : importable en Node pour
 * l'auto-play headless (CI) comme dans le navigateur. Le runtime interprète
 * le GDL : AUCUN code spécifique à un titre ici.
 *
 * Contrat : createGame(gdl, levelIndex) → state ; step(state, input, dt) → events[].
 * input = { left, right, jump, attack, laneLeft, laneRight }.
 */

/**
 * @param {object} opts.modifiers bonus de reliques : {speedMul, jumpMul, damageAdd, hpAdd}
 */
export function createGame(gdl, levelIndex = 0, opts = {}) {
  const mods = { speedMul: 1, jumpMul: 1, damageAdd: 0, hpAdd: 0, ...(opts.modifiers ?? {}) };
  const level = gdl.levels[levelIndex];
  const vp = gdl.world.viewport;
  const heroDef = Object.entries(gdl.entities).find(([, e]) => e.role === 'hero');
  const state = {
    gdl, level, vp,
    genre: gdl.genre,
    phase: 'playing', // le runtime visuel gère title/pause par-dessus
    time: 0, score: 0, deaths: 0,
    events: [],
    hero: null, enemies: [], pickups: [], hazards: [],
    camX: 0, wavesSpawned: 0, shake: 0,
  };
  const groundY = gdl.genre === 'sidescroller' ? Math.round((gdl.world.floorY ?? 0.82) * vp.h) : Math.round(vp.h * 0.86);
  state.groundY = groundY;

  const [heroId, hero] = heroDef;
  const heroStats = {
    ...hero.stats,
    hp: hero.stats.hp + mods.hpAdd,
    speed: hero.stats.speed * mods.speedMul,
    jump: (hero.stats.jump ?? 0) * mods.jumpMul,
    damage: hero.stats.damage + mods.damageAdd,
  };
  state.hero = {
    id: heroId, kind: heroId, role: 'hero',
    x: gdl.genre === 'sidescroller' ? 120 : Math.floor((gdl.world.lanes ?? 3) / 2),
    y: groundY, vx: 0, vy: 0, facing: 1, onGround: true, wasAirborne: false,
    hp: heroStats.hp, maxHp: heroStats.hp,
    stats: heroStats, scale: hero.scale,
    anim: 'idle', animT: 0, attackCd: 0, invulnT: 0, hitT: 0, landT: 0,
    checkpoint: 120, lane: Math.floor((gdl.world.lanes ?? 3) / 2), dead: false, deadT: 0,
  };
  state.levelIndex = levelIndex;

  if (gdl.genre === 'sidescroller') {
    for (const s of level.spawns ?? []) state.enemies.push(spawnEnemy(gdl, s.entity, s.x, groundY));
    // p.py = hauteur au-dessus du sol (pickup posé sur une plateforme)
    state.pickups = (level.pickups ?? []).map((p, i) => ({ ...p, id: i, y: groundY - 40 - (p.py ?? 0), taken: false }));
    state.hazards = (level.hazards ?? []).map((h, i) => ({ ...h, id: i }));
    // plateformes traversantes : {x, w, y = hauteur du dessus au-dessus du sol}
    state.platforms = (level.platforms ?? []).map((p, i) => ({ ...p, id: i, top: groundY - p.y }));
    state.hero.supportY = groundY;
  }
  return state;
}

/** Surface porteuse sous (x, feetY) : plateforme traversante ou sol. */
function supportAt(state, x, feetY, tolerance = 10) {
  let best = state.groundY;
  for (const p of state.platforms ?? []) {
    if (x < p.x || x > p.x + p.w) continue;
    if (p.top >= feetY - tolerance && p.top < best) best = p.top;
  }
  return best;
}

function spawnEnemy(gdl, kind, x, y, lane = 0) {
  const def = gdl.entities[kind];
  return {
    kind, role: def.role, x, y, lane, vx: 0, vy: 0, dir: -1,
    hp: def.stats.hp, stats: def.stats, ai: def.ai ?? { type: 'patrol', range: 200 }, scale: def.scale,
    anim: 'idle', animT: 0, attackCd: 0, hitT: 0, dead: false, deadT: 0,
    homeX: x, aggro: false,
  };
}

const overlap = (ax, aw, bx, bw) => Math.abs(ax - bx) < (aw + bw) / 2;

export function step(state, input, dt) {
  const ev = [];
  if (state.phase !== 'playing') return ev;
  state.time += dt;
  state.shake = Math.max(0, state.shake - dt * 3);
  const h = state.hero;

  // ── timers communs ──
  h.attackCd = Math.max(0, h.attackCd - dt);
  h.invulnT = Math.max(0, h.invulnT - dt);
  h.hitT = Math.max(0, h.hitT - dt);
  h.animT += dt;

  if (state.genre === 'sidescroller') stepSide(state, input, dt, ev);
  else stepArena(state, input, dt, ev);

  // ── mort / respawn ──
  if (h.dead) {
    h.deadT += dt;
    if (h.deadT > 1.2) {
      h.dead = false; h.deadT = 0; h.hp = h.maxHp; h.invulnT = 1.5;
      h.x = state.genre === 'sidescroller' ? h.checkpoint : h.x;
      h.anim = 'idle'; h.animT = 0;
      state.deaths++; ev.push({ type: 'respawn' });
    }
  }
  state.events.push(...ev);
  return ev;
}

function hurtHero(state, dmg, ev) {
  const h = state.hero;
  if (h.invulnT > 0 || h.dead) return;
  h.hp -= dmg; h.invulnT = h.stats.invuln ?? 1; h.hitT = 0.28; state.shake = 1;
  h.anim = 'hit'; h.animT = 0;
  ev.push({ type: 'hurt', hp: h.hp });
  if (h.hp <= 0) { h.dead = true; h.deadT = 0; h.anim = 'death'; h.animT = 0; ev.push({ type: 'death' }); }
}

// ═══ SIDESCROLLER ═══
function stepSide(state, input, dt, ev) {
  const h = state.hero, g = state.gdl.world.gravity ?? 2600, vp = state.vp;

  if (!h.dead) {
    // déplacement
    h.vx = (input.right ? 1 : 0) * h.stats.speed - (input.left ? 1 : 0) * h.stats.speed;
    if (h.vx !== 0) h.facing = Math.sign(h.vx);
    if (input.jump && h.onGround) { h.vy = -h.stats.jump; h.onGround = false; h.anim = 'jump'; h.animT = 0; ev.push({ type: 'jump' }); }
    h.vy += g * dt;
    const prevY = h.y;
    h.x = Math.max(60, Math.min(state.level.length - 40, h.x + h.vx * dt));
    h.y += h.vy * dt;
    if (!h.onGround) h.wasAirborne = true;

    // atterrissage : sol OU plateforme traversante (uniquement en descente)
    if (h.vy >= 0) {
      const support = supportAt(state, h.x, Math.max(prevY, h.y), 6);
      const crossed = prevY <= support + 2 && h.y >= support;
      if (crossed || h.y >= state.groundY) {
        h.y = Math.min(support, state.groundY); h.vy = 0; h.onGround = true; h.supportY = h.y;
        if (h.wasAirborne) { h.wasAirborne = false; h.landT = 0.2; h.anim = 'land'; h.animT = 0; ev.push({ type: 'land', x: h.x, y: h.y }); }
      }
    }
    // marcher hors du bord d'une plateforme → chute
    if (h.onGround && h.supportY < state.groundY) {
      const still = supportAt(state, h.x, h.supportY, 6);
      if (still > h.supportY + 2) { h.onGround = false; }
    }
    h.landT = Math.max(0, h.landT - dt);

    // attaque
    if (input.attack && h.attackCd <= 0) {
      h.attackCd = h.stats.attackCooldown; h.anim = 'attack'; h.animT = 0;
      ev.push({ type: 'attack' });
      for (const e of state.enemies) {
        if (e.dead) continue;
        const inFront = Math.sign(e.x - h.x) === h.facing || Math.abs(e.x - h.x) < 40;
        if (inFront && Math.abs(e.x - h.x) < h.stats.attackRange && Math.abs(e.y - h.y) < 120) {
          e.hp -= h.stats.damage; e.hitT = 0.25; e.anim = 'hit'; e.animT = 0;
          if (e.hp <= 0) { e.dead = true; e.deadT = 0; e.anim = 'death'; e.animT = 0; state.score += e.role === 'boss' ? 500 : 100; ev.push({ type: 'kill', kind: e.kind, boss: e.role === 'boss', x: e.x, y: e.y }); }
          else ev.push({ type: 'hit', kind: e.kind, x: e.x, y: e.y });
        }
      }
    }

    // anim au sol (land garde la priorité le temps du squash)
    if (h.onGround && h.hitT <= 0 && h.landT <= 0 && !(h.anim === 'attack' && h.animT < 0.42)) {
      const next = Math.abs(h.vx) > 10 ? 'run' : 'idle';
      if (h.anim !== next) { h.anim = next; h.animT = 0; }
    }

    // dangers au sol (une plateforme au-dessus protège)
    for (const hz of state.hazards) {
      if (h.onGround && h.y >= state.groundY - 2 && h.x > hz.x && h.x < hz.x + hz.w) {
        hurtHero(state, hz.damage ?? 1, ev);
        if (!h.dead) { h.vy = -520; h.onGround = false; }
      }
    }
    // pickups
    for (const p of state.pickups) {
      if (!p.taken && Math.abs(p.x - h.x) < 50 && Math.abs(p.y - h.y) < 90) {
        p.taken = true;
        if (p.type === 'heart') h.hp = Math.min(h.maxHp, h.hp + 1);
        else state.score += 50;
        ev.push({ type: 'pickup', kind: p.type });
      }
    }
    // checkpoints / victoire (niveau boss : tuer le boss ; sinon : la sortie)
    for (const c of state.level.checkpoints ?? []) if (h.x >= c && h.checkpoint < c) { h.checkpoint = c; ev.push({ type: 'checkpoint', x: c }); }
    const bossAlive = state.enemies.some((e) => e.role === 'boss' && !e.dead);
    if (state.level.boss) {
      if (!bossAlive && state.time > 1) { state.phase = 'won'; ev.push({ type: 'win', score: state.score, deaths: state.deaths }); }
    } else if (h.x >= (state.level.exit?.x ?? Infinity)) {
      state.phase = 'won'; ev.push({ type: 'win', score: state.score, deaths: state.deaths });
    }
  }

  // ennemis
  for (const e of state.enemies) {
    e.animT += dt; e.attackCd = Math.max(0, e.attackCd - dt); e.hitT = Math.max(0, e.hitT - dt);
    if (e.dead) { e.deadT += dt; continue; }
    const dist = h.x - e.x;
    const chasing = e.ai.type === 'chase' && Math.abs(dist) < (e.ai.aggroRange ?? 0) && !h.dead;
    if (chasing) {
      e.aggro = true; e.dir = Math.sign(dist) || e.dir;
      if (Math.abs(dist) > 70) e.x += e.dir * (e.ai.chaseSpeed ?? e.stats.speed) * dt;
      if (Math.abs(dist) < 90 && e.attackCd <= 0) {
        e.attackCd = 1.1; e.anim = 'attack'; e.animT = 0;
        if (Math.abs(dist) < 100) hurtHero(state, e.stats.damage ?? 1, ev);
      } else if (!(e.anim === 'attack' && e.animT < 0.4)) { const n = Math.abs(dist) > 70 ? 'run' : 'idle'; if (e.anim !== n) { e.anim = n; e.animT = 0; } }
    } else {
      e.aggro = false;
      e.x += e.dir * e.stats.speed * dt;
      if (Math.abs(e.x - e.homeX) > (e.ai.range ?? 200)) e.dir *= -1;
      if (e.anim !== 'run') { e.anim = 'run'; e.animT = 0; }
      if (e.stats.touchDamage && !h.dead && overlap(e.x, 70, h.x, 60) && Math.abs(e.y - h.y) < 100) hurtHero(state, e.stats.damage ?? 1, ev);
    }
  }

  // caméra
  const target = Math.max(0, Math.min(state.level.length - vp.w, h.x - vp.w * 0.42));
  state.camX += (target - state.camX) * Math.min(1, dt * 6);
}

// ═══ VERTICAL-ARENA ═══
function stepArena(state, input, dt, ev) {
  const h = state.hero, lanes = state.gdl.world.lanes ?? 3, vp = state.vp;
  const laneX = (l) => vp.w * (0.5 + (l - (lanes - 1) / 2) * 0.3);

  if (!h.dead) {
    if (input.laneLeft && !h._laneHeld) { h.lane = Math.max(0, h.lane - 1); h._laneHeld = true; }
    else if (input.laneRight && !h._laneHeld) { h.lane = Math.min(lanes - 1, h.lane + 1); h._laneHeld = true; }
    else if (!input.laneLeft && !input.laneRight) h._laneHeld = false;
    h.x += (laneX(h.lane) - h.x) * Math.min(1, dt * 12);
    h.y = state.groundY;

    if (input.attack && h.attackCd <= 0) {
      h.attackCd = h.stats.attackCooldown; h.anim = 'attack'; h.animT = 0; ev.push({ type: 'attack' });
      const targets = state.enemies.filter((e) => !e.dead && e.lane === h.lane).sort((a, b) => b.y - a.y);
      const front = targets[0];
      if (front && state.groundY - front.y < vp.h * 0.45) {
        front.hp -= h.stats.damage; front.hitT = 0.25; front.anim = 'hit'; front.animT = 0;
        if (front.hp <= 0) { front.dead = true; front.anim = 'death'; front.animT = 0; state.score += 100; ev.push({ type: 'kill', kind: front.kind }); }
        else ev.push({ type: 'hit', kind: front.kind });
      }
    } else if (h.hitT <= 0 && !(h.anim === 'attack' && h.animT < 0.38) && h.anim !== 'idle') { h.anim = 'idle'; h.animT = 0; }
  }

  // vagues
  for (const w of state.level.waves ?? []) {
    if (!w._spawned && state.time >= w.t) {
      w._spawned = true;
      state.enemies.push({ ...spawnEnemy(state.gdl, w.entity, laneX(w.lane), -80, w.lane), vy: 90 + state.time * 1.5 });
    }
  }
  // descente
  for (const e of state.enemies) {
    e.animT += dt; e.hitT = Math.max(0, e.hitT - dt);
    if (e.dead) { e.deadT += dt; continue; }
    e.y += e.vy * dt;
    if (e.anim !== 'run' && e.hitT <= 0) { e.anim = 'run'; e.animT = 0; }
    if (e.y >= state.groundY - 60) { e.dead = true; e.anim = 'death'; e.animT = 0; hurtHero(state, e.stats.damage ?? 1, ev); }
  }
  // victoire : toutes les vagues consommées + plateau nettoyé
  const remaining = (state.level.waves ?? []).some((w) => !w._spawned) || state.enemies.some((e) => !e.dead);
  if (!remaining && state.time > 3) { state.phase = 'won'; ev.push({ type: 'win', score: state.score, deaths: state.deaths }); }
}

/** Bot d'auto-play (validation headless) : avance, saute les dangers, attaque. */
export function botInput(state) {
  const h = state.hero;
  if (state.genre === 'sidescroller') {
    const ahead = (o, d) => o.x > h.x && o.x - h.x < d;
    const hazardAhead = state.hazards.some((z) => h.x < z.x + z.w && z.x - h.x < 190 && z.x + z.w > h.x - 10);
    const enemyNear = state.enemies.some((e) => !e.dead && Math.abs(e.x - h.x) < h.stats.attackRange * 0.9);
    if (state.level.boss) {
      // niveau boss : traquer l'ennemi vivant le plus proche et le frapper
      const alive = state.enemies.filter((e) => !e.dead).sort((a, b) => Math.abs(a.x - h.x) - Math.abs(b.x - h.x));
      const target = alive[0];
      if (!target) return { right: false, left: false, jump: false, attack: false };
      return {
        right: target.x > h.x + 60, left: target.x < h.x - 60,
        jump: hazardAhead && h.onGround, attack: Math.abs(target.x - h.x) < h.stats.attackRange * 0.9,
      };
    }
    const enemyAhead = state.enemies.some((e) => !e.dead && ahead(e, h.stats.attackRange * 0.9));
    return { right: !enemyNear || enemyAhead, left: false, jump: hazardAhead && h.onGround, attack: enemyNear };
  }
  const threats = state.enemies.filter((e) => !e.dead).sort((a, b) => b.y - a.y);
  const front = threats[0];
  return {
    laneLeft: front && front.lane < h.lane, laneRight: front && front.lane > h.lane,
    attack: front && front.lane === h.lane && state.groundY - front.y < state.vp.h * 0.4,
  };
}
