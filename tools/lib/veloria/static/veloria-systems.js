/** Veloria runtime systems — lane, waves, blessings, hazards, boss (Sprint E). */

export function createLaneRunner(laneMeta, spawn) {
  const centers = (laneMeta?.lanes ?? []).map((l) => l.center_x);
  let laneIndex = 1;
  const state = {
    lane: laneIndex,
    x: spawn?.x ?? centers[1] ?? 360,
    y: spawn?.y ?? 900,
    w: 80,
    h: 100,
  };

  function snap(dir) {
    if (!centers.length) return;
    laneIndex = Math.max(0, Math.min(centers.length - 1, laneIndex + dir));
    state.lane = laneIndex;
    state.x = centers[laneIndex] - state.w / 2;
  }

  function laneId() {
    return laneMeta?.lanes?.[laneIndex]?.id ?? 'lane_center';
  }

  return { state, snap, laneId, centers };
}

export function createWaveSpawner(encounters, layout, assetAtlas, laneMeta) {
  let waveIndex = 0;
  let spawned = [];
  let cleared = false;
  const softCap = 5;

  function laneCenter(laneId) {
    const lane = (laneMeta?.lanes ?? []).find((l) => l.id === laneId);
    return lane?.center_x ?? 360;
  }

  function enemySize(type, isBoss) {
    if (isBoss) return { w: 100, h: 120, hp: 12 };
    if (type === 'gargoyle') return { w: 64, h: 64, hp: 3 };
    return { w: 60, h: 60, hp: 2 };
  }

  function spawnWave() {
    spawned = [];
    cleared = false;
    const waves = encounters?.waves ?? [];
    if (waveIndex >= waves.length) return [];
    const wave = waves[waveIndex];
    let yBand = 100;
    const rows = [];

    if (wave.boss) {
      const b = wave.boss;
      const cx = laneCenter(b.spawn_lane) - 50;
      rows.push({
        id: `boss_${waveIndex}`,
        kind: b.type,
        isBoss: true,
        phase: 1,
        maxPhase: b.phase_count ?? 3,
        x: cx,
        y: yBand,
        ...enemySize(b.type, true),
        vy: 28,
        alive: true,
        sprite: assetAtlas[b.type] ?? null,
        wave: wave.wave,
      });
      for (const add of wave.adds ?? []) {
        for (let i = 0; i < add.count; i++) {
          rows.push(makeEnemy(add.type, add.lane, yBand + 60 + i * 40, wave.wave, assetAtlas));
        }
      }
    } else {
      for (const group of wave.enemies ?? []) {
        for (let i = 0; i < group.count; i++) {
          if (rows.length >= softCap) break;
          rows.push(makeEnemy(group.type, group.lane, yBand + i * 36, wave.wave, assetAtlas, group.variant));
        }
      }
    }
    spawned = rows;
    return spawned;
  }

  function makeEnemy(type, lane, y, waveNum, atlas, variant) {
    const size = enemySize(type, false);
    const cx = laneCenter(lane) - size.w / 2;
    return {
      id: `${type}_${waveNum}_${Math.random().toString(36).slice(2, 7)}`,
      kind: type,
      variant,
      x: cx,
      y,
      ...size,
      hp: variant === 'elite' || variant === 'elite_prior' ? size.hp + 1 : size.hp,
      vy: type === 'tomb_hound' ? 95 : 72,
      alive: true,
      sprite: atlas[type] ?? null,
      wave: waveNum,
    };
  }

  function advanceIfClear() {
    if (!spawned.length || !spawned.every((e) => !e.alive)) return null;
    if (cleared) return null;
    cleared = true;
    waveIndex++;
    return waveIndex;
  }

  function currentWaveNumber() {
    const w = encounters?.waves?.[waveIndex];
    return w?.wave ?? waveIndex + 1;
  }

  return {
    spawnWave,
    advanceIfClear,
    get enemies() {
      return spawned;
    },
    get waveIndex() {
      return waveIndex;
    },
    currentWaveNumber,
    totalWaves: encounters?.total_waves ?? 12,
    blessingBreaks: encounters?.blessing_breaks_after_waves ?? [3, 6, 9],
  };
}

export function createBlessingDraft(blessings, breaks) {
  let active = null;
  let picks = [];
  let applied = [];

  function shouldOffer(waveNumber) {
    return breaks.includes(waveNumber);
  }

  function open(waveNumber) {
    const pool = [...blessings].sort(() => Math.random() - 0.5);
    picks = pool.slice(0, 3);
    active = { wave: waveNumber, picks };
    return picks;
  }

  function choose(id) {
    const b = picks.find((p) => p.id === id) ?? blessings.find((p) => p.id === id);
    if (b) applied.push(b);
    active = null;
    picks = [];
    return b;
  }

  function modifiers() {
    let dmg = 1;
    let atkSpeed = 1;
    let regen = 0;
    for (const b of applied) {
      if (b.id === 'sacred_edge') dmg += 0.2;
      if (b.id === 'divine_grace') atkSpeed += 0.15;
      if (b.id === 'ember_contract') dmg += 0.25;
    }
    return { dmg, atkSpeed, regen, count: applied.length };
  }

  return { shouldOffer, open, choose, modifiers, get active() { return active; }, applied };
}

export function createHazardScheduler(hazardScript, laneMeta, layout) {
  if (!hazardScript) return { update: () => {}, render: () => {}, activeLanes: () => [] };
  let timer = 0;
  let phase = 'idle';
  let laneIdx = 1;
  let seq = 0;

  function pickLane(enemies) {
    const mode = hazardScript.pick_lane ?? 'random';
    const lanes = laneMeta?.lanes ?? [];
    if (mode === 'most_populated') {
      const counts = lanes.map((l) => ({ id: l.id, n: enemies.filter((e) => e.alive && Math.abs(e.x + e.w / 2 - l.center_x) < 80).length }));
      counts.sort((a, b) => b.n - a.n);
      return counts[0]?.id ?? 'lane_center';
    }
    if (mode === 'sequential') {
      seq = (seq + 1) % lanes.length;
      return lanes[seq]?.id ?? 'lane_center';
    }
    if (mode === 'all') return 'all';
    if (mode === 'alternating') return seq++ % 2 === 0 ? 'lane_left' : 'lane_right';
    if (mode === 'center_first') return 'lane_center';
    return lanes[Math.floor(Math.random() * lanes.length)]?.id ?? 'lane_center';
  }

  function update(dt, enemies) {
    timer += dt * 1000;
    const tele = hazardScript.telegraph_duration_ms ?? 1400;
    const active = hazardScript.active_duration_ms ?? 3200;
    const cd = hazardScript.cooldown_ms ?? 6000;
    const cycle = tele + active + cd;
    const t = timer % cycle;
    if (t < tele) phase = 'telegraph';
    else if (t < tele + active) phase = 'active';
    else phase = 'idle';
    if (t < 50) laneIdx = pickLane(enemies);
  }

  function activeLanes() {
    if (phase === 'idle') return [];
    const lanes = laneMeta?.lanes ?? [];
    if (laneIdx === 'all') return lanes.map((l) => l.id);
    const found = lanes.find((l) => l.id === laneIdx);
    return found ? [found.id] : [];
  }

  function render(ctx, layout, pulse) {
    const lanes = laneMeta?.lanes ?? [];
    const active = activeLanes();
    if (!active.length || phase === 'idle') return;
    const flash = phase === 'telegraph' ? Math.sin(pulse * (hazardScript.visual?.pulse_hz ?? 4)) > 0.2 : true;
    if (!flash) return;
    ctx.fillStyle = hazardScript.visual?.color ?? 'rgba(158, 79, 92, 0.75)';
    for (const laneId of active) {
      const lane = lanes.find((l) => l.id === laneId);
      if (!lane) continue;
      const zone = (layout.zones ?? []).find((z) => z.id === laneId);
      if (zone) ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
    }
  }

  function damagesPlayer(playerLaneId) {
    if (phase !== 'active') return false;
    return activeLanes().includes(playerLaneId);
  }

  return { update, render, damagesPlayer, get phase() { return phase; } };
}

export function createBossPhases() {
  function onBossHit(boss, damage) {
    if (!boss?.isBoss) return boss;
    boss.hp -= damage;
    const threshold = boss.maxPhase ? boss.hp / (12 / boss.maxPhase) : 4;
    if (boss.hp <= threshold && boss.phase < boss.maxPhase) {
      boss.phase++;
      boss.hp += 2;
      boss.vy = Math.min(boss.vy + 8, 48);
    }
    if (boss.hp <= 0) boss.alive = false;
    return boss;
  }
  return { onBossHit };
}

export async function loadAssetAtlas(gdl) {
  const atlas = gdl.meta?.asset_atlas ?? {};
  const images = {};
  await Promise.all(
    Object.entries(atlas).map(async ([key, url]) => {
      if (!url) return;
      images[key] = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
      });
    }),
  );
  return images;
}

export function normalizeAsset(path) {
  if (!path) return null;
  if (path.startsWith('/workspaces/')) return '../../' + path.split('/').slice(4).join('/');
  return path;
}
