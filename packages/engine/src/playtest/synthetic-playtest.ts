/**
 * Playtest synthétique — policies headless sur sim Ellipse.
 */
import { GameDefinitionSchema, normalizeGdlForParse, type GameDefinition } from '@ellipse/shared';
import { createWorld, type SimInput } from '../sim/world.js';
import { stepSimulation } from '../sim/systems.js';
import { veloriaDraftKey } from '../sim/veloria-survival.js';

export interface SyntheticPlaytestConfig {
  runs: number;
  framesPerRun: number;
  maxFramesPerRun: number;
  dtMs: number;
}

export interface SyntheticPlaytestReport {
  generated_at: string;
  runs: number;
  wins: number;
  losses: number;
  avg_score: number;
  avg_health_remaining: number;
  avg_health: number;
  deaths_by_hazard: number;
  policy: string;
}

const NO_INPUT: SimInput = { left: false, right: false, jump: false };

/** Frames max Veloria : 3 min @ 60fps + marge vagues/boss. */
const VELORIA_MAX_FRAMES = 12000;

function veloriaInput(world: ReturnType<typeof createWorld>): SimInput {
  const v = world.veloria;
  if (!v) return NO_INPUT;
  let lane = 1;
  if (v.hazardPhase === 'telegraph' || v.hazardPhase === 'active') {
    if (v.hazardLaneId === 'all') {
      lane = v.laneIndex;
    } else {
      const safe = v.laneIds.findIndex((id) => id !== v.hazardLaneId);
      if (safe >= 0) lane = safe;
    }
  }
  return { left: lane === 0, right: lane === 2, jump: false };
}

function simulateRun(gdl: GameDefinition, maxFrames: number, dtMs: number): {
  won: boolean;
  lost: boolean;
  score: number;
  health: number;
  hazardDeaths: number;
} {
  const world = createWorld(gdl);
  let hazardDeaths = 0;
  const cap = world.veloria ? Math.max(maxFrames, VELORIA_MAX_FRAMES) : maxFrames;

  for (let f = 0; f < cap; f++) {
    if (world.gameOver || world.levelWon) break;
    if (world.veloria?.draftActive) {
      veloriaDraftKey(world, '1');
      continue;
    }
    stepSimulation(world, dtMs, world.veloria ? veloriaInput(world) : NO_INPUT);
    if (world.events.some((e) => e.type === 'damage' && e.data?.source === 'hazard')) hazardDeaths++;
  }

  return {
    won: world.levelWon,
    lost: world.gameOver,
    score: world.player.score,
    health: Math.max(0, world.player.health),
    hazardDeaths,
  };
}

export function runSyntheticPlaytest(
  gdl: GameDefinition,
  config: Partial<SyntheticPlaytestConfig> = {},
): SyntheticPlaytestReport {
  const { runs = 20, framesPerRun = 600, maxFramesPerRun = VELORIA_MAX_FRAMES, dtMs = 16 } = config;
  let wins = 0;
  let losses = 0;
  let totalScore = 0;
  let totalHealth = 0;
  let hazardDeaths = 0;
  const isVeloria = (gdl.systems ?? []).includes('lane_runner');

  for (let r = 0; r < runs; r++) {
    const result = simulateRun(gdl, isVeloria ? maxFramesPerRun : framesPerRun, dtMs);
    if (result.won) wins++;
    else if (result.lost) losses++;
    totalScore += result.score;
    totalHealth += result.health;
    hazardDeaths += result.hazardDeaths;
  }

  const avgHealth = totalHealth / runs;
  return {
    generated_at: new Date().toISOString(),
    runs,
    wins,
    losses,
    avg_score: totalScore / runs,
    avg_health_remaining: avgHealth,
    avg_health: avgHealth,
    deaths_by_hazard: hazardDeaths,
    policy: isVeloria ? 'veloria_survivor_v2' : 'idle',
  };
}

export function loadGdlForPlaytest(raw: unknown): GameDefinition {
  return GameDefinitionSchema.parse(normalizeGdlForParse(raw));
}
