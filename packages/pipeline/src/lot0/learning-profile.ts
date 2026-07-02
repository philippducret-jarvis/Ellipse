import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import type { ElementLabel } from './extract-elements.js';

export interface Lot0LearningSettings {
  analysisSize: number;
  frameSize: number;
  frameCount: number;
  textureSize: number;
  depthStrength: number;
  motionScale: number;
}

export interface Lot0LearningAttempt {
  sessionId: string;
  score: number;
  elementCount: number;
  layerCount: number;
  vertexCount: number;
  paletteSize: number;
  createdAt: string;
  settings: Lot0LearningSettings;
}

export interface Lot0LearningProfile {
  version: 'lot0-learning-v1';
  fingerprint: string;
  source: {
    width: number;
    height: number;
    aspectRatio: number;
  };
  attempts: number;
  bestScore: number;
  lastScore: number;
  settings: Lot0LearningSettings;
  bestSettings: Lot0LearningSettings;
  preferredAnchors: Partial<Record<ElementLabel, number>>;
  history: Lot0LearningAttempt[];
  updatedAt: string;
}

export interface Lot0LearningResultSummary {
  fingerprint: string;
  attempt: number;
  score: number;
  bestScore: number;
  settings: Lot0LearningSettings;
}

interface Lot0LearningMetrics {
  sessionId: string;
  elementCount: number;
  layerCount: number;
  vertexCount: number;
  paletteSize: number;
  anchorOffsets: Partial<Record<ElementLabel, number>>;
}

const PROFILE_DIR = '_learning';
const DEFAULT_SETTINGS: Lot0LearningSettings = {
  analysisSize: 256,
  frameSize: 128,
  frameCount: 4,
  textureSize: 768,
  depthStrength: 0.08,
  motionScale: 1,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, decimals = 3): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export async function computeLearningFingerprint(sourcePath: string): Promise<string> {
  const file = await readFile(sourcePath);
  return createHash('sha256').update(file).digest('hex').slice(0, 16);
}

export function learningProfilePath(outputDir: string, fingerprint: string): string {
  return join(outputDir, PROFILE_DIR, `${fingerprint}.json`);
}

export async function readLearningProfile(
  outputDir: string,
  fingerprint: string,
): Promise<Lot0LearningProfile | null> {
  try {
    const raw = await readFile(learningProfilePath(outputDir, fingerprint), 'utf8');
    return JSON.parse(raw) as Lot0LearningProfile;
  } catch {
    return null;
  }
}

export async function deriveLearningSettings(
  sourcePath: string,
  outputDir: string,
): Promise<{
  fingerprint: string;
  profile: Lot0LearningProfile | null;
  settings: Lot0LearningSettings;
}> {
  const fingerprint = await computeLearningFingerprint(sourcePath);
  const profile = await readLearningProfile(outputDir, fingerprint);

  if (!profile) {
    return { fingerprint, profile: null, settings: DEFAULT_SETTINGS };
  }

  const pressure = clamp(profile.attempts, 1, 5);
  const recovering = profile.lastScore < profile.bestScore * 0.82 ? 1 : 0;
  const anchorCount = Object.keys(profile.preferredAnchors).length;

  const settings: Lot0LearningSettings = {
    analysisSize: clamp(
      Math.max(profile.bestSettings.analysisSize, DEFAULT_SETTINGS.analysisSize + pressure * 48 + recovering * 32),
      DEFAULT_SETTINGS.analysisSize,
      512,
    ),
    frameSize: clamp(
      Math.max(profile.bestSettings.frameSize, DEFAULT_SETTINGS.frameSize + pressure * 16),
      DEFAULT_SETTINGS.frameSize,
      224,
    ),
    frameCount: clamp(
      Math.max(profile.bestSettings.frameCount, DEFAULT_SETTINGS.frameCount + Math.floor((pressure + recovering) / 2)),
      DEFAULT_SETTINGS.frameCount,
      6,
    ),
    textureSize: clamp(
      Math.max(profile.bestSettings.textureSize, DEFAULT_SETTINGS.textureSize + pressure * 128 + recovering * 128),
      DEFAULT_SETTINGS.textureSize,
      1536,
    ),
    depthStrength: round(
      clamp(
        Math.max(profile.bestSettings.depthStrength, DEFAULT_SETTINGS.depthStrength + pressure * 0.018 + anchorCount * 0.004),
        DEFAULT_SETTINGS.depthStrength,
        0.2,
      ),
    ),
    motionScale: round(
      clamp(
        Math.max(profile.bestSettings.motionScale, DEFAULT_SETTINGS.motionScale + pressure * 0.08),
        DEFAULT_SETTINGS.motionScale,
        1.4,
      ),
    ),
  };

  return { fingerprint, profile, settings };
}

function scoreAttempt(metrics: Lot0LearningMetrics, settings: Lot0LearningSettings): number {
  const elementScore = Math.min(1, metrics.elementCount / 5);
  const layerScore = Math.min(1, metrics.layerCount / 4);
  const meshScore = Math.min(1, metrics.vertexCount / 24);
  const paletteScore = Math.min(1, metrics.paletteSize / 6);
  const motionScore = Math.min(1, settings.frameCount / 6);
  const fidelityBoost = Math.min(1, settings.textureSize / 1536) * 0.08;
  const score =
    elementScore * 0.24 +
    layerScore * 0.24 +
    meshScore * 0.2 +
    paletteScore * 0.14 +
    motionScore * 0.18 +
    fidelityBoost;
  return Math.round(score * 100);
}

export async function updateLearningProfile(input: {
  sourcePath: string;
  outputDir: string;
  fingerprint: string;
  previousProfile: Lot0LearningProfile | null;
  settings: Lot0LearningSettings;
  metrics: Lot0LearningMetrics;
}): Promise<Lot0LearningProfile> {
  const metadata = await sharp(input.sourcePath).rotate().metadata();
  const width = metadata.width ?? input.settings.analysisSize;
  const height = metadata.height ?? input.settings.analysisSize;
  const score = scoreAttempt(input.metrics, input.settings);
  const attempts = (input.previousProfile?.attempts ?? 0) + 1;
  const bestScore = Math.max(input.previousProfile?.bestScore ?? 0, score);
  const bestSettings =
    score >= (input.previousProfile?.bestScore ?? 0)
      ? input.settings
      : (input.previousProfile?.bestSettings ?? input.settings);

  const profile: Lot0LearningProfile = {
    version: 'lot0-learning-v1',
    fingerprint: input.fingerprint,
    source: {
      width,
      height,
      aspectRatio: round(width / Math.max(1, height)),
    },
    attempts,
    bestScore,
    lastScore: score,
    settings: input.settings,
    bestSettings,
    preferredAnchors: {
      ...(input.previousProfile?.preferredAnchors ?? {}),
      ...input.metrics.anchorOffsets,
    },
    history: [
      ...(input.previousProfile?.history ?? []),
      {
        sessionId: input.metrics.sessionId,
        score,
        elementCount: input.metrics.elementCount,
        layerCount: input.metrics.layerCount,
        vertexCount: input.metrics.vertexCount,
        paletteSize: input.metrics.paletteSize,
        createdAt: new Date().toISOString(),
        settings: input.settings,
      },
    ].slice(-12),
    updatedAt: new Date().toISOString(),
  };

  const profilePath = learningProfilePath(input.outputDir, input.fingerprint);
  await mkdir(join(input.outputDir, PROFILE_DIR), { recursive: true });
  await writeFile(profilePath, JSON.stringify(profile, null, 2), 'utf8');
  return profile;
}

export function toLearningSummary(profile: Lot0LearningProfile): Lot0LearningResultSummary {
  return {
    fingerprint: profile.fingerprint,
    attempt: profile.attempts,
    score: profile.lastScore,
    bestScore: profile.bestScore,
    settings: profile.settings,
  };
}
