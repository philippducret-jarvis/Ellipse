import type { GameDefinition } from '@ellipse/shared';
import { DEFAULT_PREVIEW_HEIGHT, DEFAULT_PREVIEW_WIDTH } from './constants.js';

function isVeloriaGdl(gdl: GameDefinition): boolean {
  return (
    gdl.systems?.includes('lane_runner') ||
    gdl.meta?.title?.toLowerCase().includes('veloria') ||
    gdl.scenes?.some((s) => !!(s as { veloria?: unknown }).veloria)
  );
}

function isMergeDropGdl(gdl: GameDefinition): boolean {
  return gdl.systems?.includes('merge_drop_physics') || gdl.meta?.genre === 'merge_drop_gacha';
}

export async function createEllipsePreviewRuntime(
  container: HTMLDivElement,
  gdl: GameDefinition,
): Promise<() => void> {
  const res = gdl.meta?.resolution as number[] | undefined;
  const width = res?.[0] ?? DEFAULT_PREVIEW_WIDTH;
  const height = res?.[1] ?? DEFAULT_PREVIEW_HEIGHT;

  if (isMergeDropGdl(gdl)) {
    const { MergeDropEngine } = await import('@ellipse/engine');
    const engine = new MergeDropEngine();
    await engine.init({ container, width, height });
    await engine.loadGDL(gdl);
    return () => engine.destroy();
  }

  if (isVeloriaGdl(gdl)) {
    const { VeloriaEngine } = await import('@ellipse/engine');
    const atlas = (gdl.meta as { asset_atlas?: Record<string, string> })?.asset_atlas ?? {};
    const player = gdl.entities?.find((e) => e.id === 'player');
    const engine = new VeloriaEngine();
    await engine.init({
      container,
      width,
      height,
      heroSpriteUrl: player?.assets?.sprite ?? atlas.aureline,
      hubBgUrl: atlas.pavillon_veilles ?? gdl.scenes?.[0]?.background?.image,
    });
    await engine.loadGDL(gdl);
    return () => engine.destroy();
  }

  const { EllipseEngine } = await import('@ellipse/engine');
  const engine = new EllipseEngine();
  await engine.init({ container, width, height });
  await engine.loadGDL(gdl);
  return () => engine.destroy();
}
