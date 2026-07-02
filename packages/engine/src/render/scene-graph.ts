/**
 * Arbre de scène 2.5D — ParallaxRoot + YSort + HUD (structure type Godot).
 */
import { Container } from 'pixi.js';
import { ParallaxLayerStack, type ParallaxStackOptions } from './parallax-layers.js';
import { ensureSortableContainer } from './depth-sort.js';
import { resolveScrollFactor, type BackgroundLike, type ParallaxLayer } from '@ellipse/shared';

export interface SceneGraph {
  stage: Container;
  parallaxBack: ParallaxLayerStack;
  world: Container;
  parallaxFront: ParallaxLayerStack;
  hud: Container;
}

export interface SceneGraphBuildInput {
  background?: BackgroundLike;
  foregroundBackground?: BackgroundLike;
  parallaxOpts: ParallaxStackOptions;
}

export async function createSceneGraph(input: SceneGraphBuildInput): Promise<SceneGraph> {
  const stage = new Container();
  const backLayers = input.background?.layers?.filter(
    (l: ParallaxLayer) => l.sort_group !== 'foreground' && resolveScrollFactor(l) < 1.05,
  );
  const fgLayers = input.foregroundBackground?.layers ?? input.background?.layers?.filter(
    (l: ParallaxLayer) => l.sort_group === 'foreground' || resolveScrollFactor(l) > 1.02,
  );

  const parallaxBack = new ParallaxLayerStack(
    backLayers?.length ? { ...input.background, layers: backLayers } : input.background,
    input.parallaxOpts,
  );
  await parallaxBack.load();

  const world = new Container();
  ensureSortableContainer(world);

  const parallaxFront = new ParallaxLayerStack(
    fgLayers?.length ? { layers: fgLayers } : undefined,
    input.parallaxOpts,
  );
  await parallaxFront.load();

  const hud = new Container();
  hud.zIndex = 1_000_000;

  stage.addChild(parallaxBack.root);
  stage.addChild(world);
  stage.addChild(parallaxFront.root);

  return { stage, parallaxBack, world, parallaxFront, hud };
}

export function disposeSceneGraph(graph: SceneGraph | null): void {
  if (!graph) return;
  graph.parallaxBack.dispose();
  graph.parallaxFront.dispose();
  graph.stage.destroy({ children: true });
}
