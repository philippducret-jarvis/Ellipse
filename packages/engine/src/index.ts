import { Application, Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import type { CameraSpec, DepthSpec, GameDefinition, GdlTilemap } from '@ellipse/shared';
import {
  defaultDepthSpecForMode,
  laneParallaxShift,
  scaleAtY,
  platformsToTileLayer,
  type DepthMode,
} from '@ellipse/shared';
import { createWorld, type SimWorld, type SimInput } from './sim/world.js';
import { stepSimulation } from './sim/systems.js';
import { GameFeelAudio } from './audio/game-feel-audio.js';
import { createGdlAudioBus, disposeGdlAudio, loadGdlAudio, playGdlSfx, type GdlAudioBus } from './audio/gdl-audio.js';
import { veloriaDraftKey } from './sim/veloria-survival.js';
import {
  createSkeletal2D,
  parseRigSpec,
  idlePosePhase,
  deriveRigUrlFromSprite,
  deriveSilhouetteUrlFromSprite,
  type Skeletal2DInstance,
} from './render/skeletal2d.js';
import { applyDepthSort, sortKeyForEntity, type SortableEntity } from './render/depth-sort.js';
import { createSceneGraph, disposeSceneGraph, type SceneGraph } from './render/scene-graph.js';
import { TilemapLayer } from './render/tilemap-layer.js';
import {
  clearEnemyPool,
  enemyFingerprint,
  syncEnemyPool,
  updateEnemyPoolDisplays,
  type EnemyPoolState,
} from './render/enemy-pool.js';
import {
  resolveCameraMode,
  updateCameraFollow,
  type CameraState,
} from './render/camera-follow.js';

// ── API runtime publique (consommée par le code-gen et les agents) ──
export { createWorld, applyScene, nextSceneIndex } from './sim/world.js';
export type { SimWorld, SimInput, SimEvent, SimPlayer, SimEnemy } from './sim/world.js';
export { stepSimulation, respawnPlayer } from './sim/systems.js';
export { veloriaDraftKey, initVeloriaSurvival, stepVeloriaSurvival } from './sim/veloria-survival.js';
export type { VeloriaSimState } from './sim/veloria-survival.js';
export { createGdlAudioBus, loadGdlAudio, playGdlSfx, disposeGdlAudio } from './audio/gdl-audio.js';
export { applyDepthSort, type SortableEntity } from './render/depth-sort.js';
export { ParallaxLayerStack } from './render/parallax-layers.js';
export { createSceneGraph, disposeSceneGraph, type SceneGraph } from './render/scene-graph.js';
export { updateCameraFollow, resolveCameraMode, type CameraState } from './render/camera-follow.js';
export { createSkeletal2D, parseRigSpec, idlePosePhase, deriveRigUrlFromSprite, deriveSilhouetteUrlFromSprite, type RigSpec, type Skeletal2DInstance } from './render/skeletal2d.js';
export { TilemapLayer } from './render/tilemap-layer.js';
export { runSyntheticPlaytest, loadGdlForPlaytest, type SyntheticPlaytestReport } from './playtest/synthetic-playtest.js';

export interface EngineOptions {
  container: HTMLElement;
  width?: number;
  height?: number;
  /** Si false, stepSimulation est ignoré (hub / menus Veloria). */
  shouldSimulate?: () => boolean;
  afterRender?: (dtMs: number) => void;
  veloriaMode?: boolean;
}

interface SpriteSheetAnim {
  source: Texture['source'];
  frameW: number;
  frameH: number;
  frameCount: number;
  animTime: number;
}

/**
 * Runtime Ellipse — **rendu Pixi piloté par un cœur de simulation pur** (`./sim`).
 *
 * Toute la logique gameplay vit dans `sim/` (testable en headless). L'engine se contente
 * de construire les objets Pixi depuis le `SimWorld` puis de les synchroniser chaque frame.
 * Les systèmes actifs sont décidés par `gdl.systems[]` → moteur data-driven multi-genres.
 */
export class EllipseEngine {
  private app: Application | null = null;
  private gdl: GameDefinition | null = null;
  private world: SimWorld | null = null;

  // ── Rendu (aligné par index sur world.enemies / world.collectibles) ──
  private playerSprite: Sprite | null = null;
  private playerSkeletal: Skeletal2DInstance | null = null;
  private playerSkeletalWrap: Container | null = null;
  private rigPhase = 0;
  private layerSprites: Sprite[] = [];
  private spriteAnim: SpriteSheetAnim | null = null;
  private playerFallback: Graphics | null = null;
  private platformGfx: Graphics[] = [];
  private enemyGfx: (Graphics | null)[] = [];
  private enemySprites: (Sprite | null)[] = [];
  private collectibleGfx: Graphics[] = [];
  private goalGfx: Graphics | null = null;
  private sceneGraph: SceneGraph | null = null;
  private cameraState: CameraState = { x: 0, y: 0 };
  private depthSpec: DepthSpec = defaultDepthSpecForMode('side_scroll');
  private cameraSpec: CameraSpec = {};
  private engineOptions: EngineOptions | null = null;
  private tilemapLayer: TilemapLayer | null = null;
  private enemyPool: EnemyPoolState = { entries: [], fingerprint: '', textureCache: new Map() };
  private enemySyncPending = false;
  private hudHealth: Graphics | null = null;
  private hudScore: Text | null = null;
  private hudMsg: Text | null = null;

  private get worldContainer(): Container | null {
    return this.sceneGraph?.world ?? null;
  }

  private resolveSceneDepth(scene: GameDefinition['scenes'][number]): DepthSpec {
    const layout = scene.layout as { ground_y?: number; height?: number } | undefined;
    if (scene.depth) return scene.depth as DepthSpec;
    const veloria = (scene as { veloria?: unknown }).veloria;
    const mode: DepthMode = veloria ? 'lane_perspective' : 'side_scroll';
    return defaultDepthSpecForMode(mode, layout);
  }

  private keys = new Set<string>();
  private audio = new GameFeelAudio();
  private gdlAudio: GdlAudioBus = createGdlAudioBus();
  private boundKeyDown = (e: KeyboardEvent) => this.onKey(e, true);
  private boundKeyUp = (e: KeyboardEvent) => this.onKey(e, false);

  async init(options: EngineOptions): Promise<void> {
    this.engineOptions = options;
    this.app = new Application();
    await this.app.init({
      width: options.width ?? 1280,
      height: options.height ?? 720,
      backgroundColor: 0x1a1a2e,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    options.container.appendChild(this.app.canvas);
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    this.app.ticker.add(this.tick);
  }

  getApplication(): Application | null {
    return this.app;
  }

  getSimWorld(): SimWorld | null {
    return this.world;
  }

  getWorldContainer(): Container | null {
    return this.worldContainer;
  }

  async rebuildScene(): Promise<void> {
    await this.buildScene();
  }

  handleVeloriaDraftKey(key: string): void {
    if (this.world) veloriaDraftKey(this.world, key);
  }

  async loadGDL(gdl: GameDefinition): Promise<void> {
    this.gdl = gdl;
    this.world = createWorld(gdl);
    disposeGdlAudio(this.gdlAudio);
    this.gdlAudio = createGdlAudioBus();
    await loadGdlAudio(this.gdlAudio, gdl as GameDefinition & { audio?: { bgm?: string; sfx?: Record<string, string> } });
    await this.buildScene();
  }

  private async buildScene(): Promise<void> {
    if (!this.app || !this.gdl || !this.world) return;
    const w = this.world;
    disposeSceneGraph(this.sceneGraph);
    this.sceneGraph = null;
    this.tilemapLayer?.dispose();
    this.tilemapLayer = null;
    this.enemyPool.fingerprint = '';
    this.platformGfx = [];
    this.enemyGfx = [];
    this.enemySprites = [];
    this.collectibleGfx = [];
    this.goalGfx = null;
    this.playerSprite = null;
    this.playerSkeletal?.dispose();
    this.playerSkeletal = null;
    this.playerSkeletalWrap = null;
    this.rigPhase = 0;
    this.layerSprites = [];
    this.spriteAnim = null;
    this.playerFallback = null;
    this.hudHealth = null;
    this.hudScore = null;
    this.hudMsg = null;
    this.cameraState = { x: 0, y: 0 };

    this.app.stage.removeChildren();

    const scene0 = this.gdl.scenes[this.world.sceneIndex];
    this.depthSpec = this.resolveSceneDepth(scene0);
    this.cameraSpec = (scene0.camera ?? {}) as CameraSpec;
    const bgData = scene0?.background;
    if (bgData?.color) this.app.renderer.background.color = bgData.color;

    this.sceneGraph = await createSceneGraph({
      background: bgData,
      parallaxOpts: {
        worldWidth: w.worldWidth,
        worldHeight: w.worldHeight,
        viewWidth: this.app.screen.width,
        viewHeight: this.app.screen.height,
      },
    });
    this.app.stage.addChild(this.sceneGraph.stage);

    const world = this.sceneGraph.world;

    const layout = scene0?.layout as { tilemap?: GdlTilemap; width?: number; height?: number; platforms?: unknown[] } | undefined;
    let tilemap = layout?.tilemap;
    if (!tilemap && layout?.platforms?.length && (scene0.background as { tileset?: string })?.tileset) {
      tilemap = {
        tileset: (scene0.background as { tileset: string }).tileset,
        tile_size: 64,
        layers: [
          platformsToTileLayer(
            w.platforms,
            w.worldWidth,
            w.worldHeight,
            64,
            'ground',
          ),
        ],
      };
    }
    if (tilemap?.tileset) {
      this.tilemapLayer = new TilemapLayer({ tilemap });
      await this.tilemapLayer.load();
      world.addChildAt(this.tilemapLayer.root, 0);
    }

    const hidePlatformDebug = !!tilemap || this.engineOptions?.veloriaMode;
    if (!hidePlatformDebug) {
    for (const plat of w.platforms) {
      const gfx = new Graphics();
      const isGround = plat.type === 'ground';
      gfx.rect(plat.x, plat.y, plat.w, plat.h);
      gfx.fill(isGround ? 0x0f3460 : 0x16213e);
      gfx.stroke({ color: 0x533483, width: isGround ? 0 : 2 });
      world.addChild(gfx);
      this.platformGfx.push(gfx);
    }
    }

    for (const col of w.collectibles) {
      const gfx = new Graphics();
      gfx.circle(col.x + col.width / 2, col.y + col.height / 2, 8);
      gfx.fill(0xffd700);
      world.addChild(gfx);
      this.collectibleGfx.push(gfx);
    }

    if (w.goal) {
      const gfx = new Graphics();
      gfx.rect(w.goal.x, w.goal.y, w.goal.w, w.goal.h);
      gfx.fill(0x00ff88);
      world.addChild(gfx);
      this.goalGfx = gfx;
    }

    const atlas = (this.gdl.meta as { asset_atlas?: Record<string, string> })?.asset_atlas ?? {};
    clearEnemyPool(world, this.enemyPool);
    await syncEnemyPool(world, w.enemies, atlas, this.enemyPool);

    await this.buildPlayerSprite();

    const veloriaHud = this.engineOptions?.veloriaMode;
    if (!veloriaHud) {
    this.hudHealth = new Graphics();
    this.app.stage.addChild(this.hudHealth);

    this.hudScore = new Text({
      text: 'Score: 0',
      style: { fill: 0xffffff, fontSize: 16, fontFamily: 'system-ui, monospace' },
    });
    this.hudScore.x = w.worldWidth - 140;
    this.hudScore.y = 8;
    this.app.stage.addChild(this.hudScore);

    const title = new Text({
      text: this.gdl.meta.title,
      style: { fill: 0xffffff, fontSize: 16, fontFamily: 'system-ui' },
    });
    title.x = 12;
    title.y = 8;
    this.app.stage.addChild(title);

    this.hudMsg = new Text({
      text: '',
      style: { fill: 0xffd700, fontSize: 28, fontFamily: 'system-ui', fontWeight: 'bold' },
    });
    this.hudMsg.x = w.worldWidth / 2;
    this.hudMsg.y = w.worldHeight / 2 - 30;
    this.hudMsg.anchor.set(0.5, 0.5);
    this.app.stage.addChild(this.hudMsg);

    this.drawHud();
    }
  }

  private async buildPlayerSprite(): Promise<void> {
    if (!this.app || !this.gdl || !this.world) return;
    const player = this.world.player;
    const playerEntity = this.gdl.entities.find((e) => e.id === 'player');
    const assets = playerEntity?.assets as
      | {
          sprite?: string;
          rig?: string;
          frame_count?: number;
          layers?: { url: string; offsetY?: number }[];
        }
      | undefined;
    const spriteUrl = assets?.sprite;
    const layerDefs = assets?.layers ?? [];
    const frameCount = assets?.frame_count ?? 4;

    if (spriteUrl && !spriteUrl.includes('placeholder')) {
      const rigUrl = assets?.rig ?? deriveRigUrlFromSprite(spriteUrl);
      const rigLoaded = await this.tryBuildPlayerSkeletal(rigUrl, spriteUrl, player.width, player.height);
      if (rigLoaded) return;

      try {
        const sheet = await Assets.load<Texture>(spriteUrl);
        const frameW = Math.floor(sheet.width / frameCount);
        const frameH = sheet.height;
        const frame = new Rectangle(0, 0, frameW, frameH);
        const texture = new Texture({ source: sheet.source, frame });
        this.playerSprite = new Sprite(texture);
        this.playerSprite.width = player.width;
        this.playerSprite.height = player.height;
        this.spriteAnim = { source: sheet.source, frameW, frameH, frameCount, animTime: 0 };
        this.worldContainer?.addChild(this.playerSprite);

        for (const layer of layerDefs) {
          try {
            const layerTex = await Assets.load<Texture>(layer.url);
            const ls = new Sprite(layerTex);
            ls.width = player.width * 0.55;
            ls.height = player.height * 0.35;
            ls.x = player.x;
            ls.y = player.y + (layer.offsetY ?? 0) * (player.height / 128);
            this.layerSprites.push(ls);
            this.worldContainer?.addChild(ls);
          } catch {
            /* couche optionnelle */
          }
        }
        return;
      } catch {
        this.spriteAnim = null;
      }
    }
    this.addFallbackPlayer();
  }

  /** F2 — rig 2D si rig.json disponible dans le workspace asset pack. */
  private async tryBuildPlayerSkeletal(
    rigUrl: string,
    spriteUrl: string,
    width: number,
    height: number,
  ): Promise<boolean> {
    if (!this.worldContainer) return false;
    try {
      const res = await fetch(rigUrl);
      if (!res.ok) return false;
      const rig = parseRigSpec(await res.json());
      if (!rig) return false;

      const silhouetteUrl = deriveSilhouetteUrlFromSprite(spriteUrl);
      const partTextures: Record<string, string> = { body: silhouetteUrl, torso: silhouetteUrl };
      for (const part of rig.parts ?? []) {
        partTextures[part.id] = silhouetteUrl;
      }

      const skel = await createSkeletal2D(rig, partTextures);
      const wrap = new Container();
      wrap.addChild(skel.root);
      const scale = height / (rig.canvas?.height ?? height);
      wrap.scale.set(scale);
      this.playerSkeletal = skel;
      this.playerSkeletalWrap = wrap;
      this.worldContainer.addChild(wrap);
      return true;
    } catch {
      return false;
    }
  }

  private perspectiveScale(y: number, height: number): number {
    if (this.depthSpec.mode !== 'lane_perspective') return 1;
    const horizon = this.depthSpec.horizon_y ?? 110;
    const ground = this.depthSpec.ground_y ?? this.world?.worldHeight ?? 720;
    const feet = y + height * (this.depthSpec.feet_offset ?? 0.92);
    return scaleAtY(feet, horizon, ground, this.depthSpec.scale_range);
  }

  private laneShiftPx(): number {
    if (!this.world?.veloria) return 0;
    const lanes = this.world.veloria.laneIds.length || 3;
    return laneParallaxShift(
      this.world.veloria.laneIndex,
      lanes,
      this.depthSpec.lane_parallax_shift ?? 22,
    );
  }

  private addFallbackPlayer(): void {
    if (!this.app || !this.world || !this.worldContainer) return;
    this.playerFallback = new Graphics();
    this.worldContainer.addChild(this.playerFallback);
    this.drawFallback();
  }

  private drawFallback(): void {
    if (!this.playerFallback || !this.world) return;
    const p = this.world.player;
    this.playerFallback.clear();
    const alpha = p.invincibleMs > 0 && Math.floor(p.invincibleMs / 80) % 2 === 0 ? 0.3 : 1;
    this.playerFallback.roundRect(p.x, p.y, p.width, p.height, 8);
    this.playerFallback.fill({ color: 0xe94560, alpha });
  }

  private drawHud(): void {
    if (!this.hudHealth || !this.world || !this.hudScore) return;
    const p = this.world.player;
    this.hudHealth.clear();
    for (let i = 0; i < p.maxHealth; i++) {
      const filled = i < p.health;
      this.hudHealth.roundRect(12 + i * 28, this.world.worldHeight - 28, 22, 18, 3);
      this.hudHealth.fill(filled ? 0xe94560 : 0x333355);
    }
    this.hudScore.text = `Score: ${p.score}`;
  }

  private gatherInput(): SimInput {
    const k = this.keys;
    return {
      left: k.has('ArrowLeft') || k.has('a') || k.has('A'),
      right: k.has('ArrowRight') || k.has('d') || k.has('D'),
      jump: k.has(' ') || k.has('ArrowUp') || k.has('w') || k.has('W'),
      up: k.has('ArrowUp') || k.has('w') || k.has('W'),
      down: k.has('ArrowDown') || k.has('s') || k.has('S'),
    };
  }

  private tick = (): void => {
    if (!this.world || !this.app) return;
    const w = this.world;

    if (w.gameOver || w.levelWon) {
      if (!this.engineOptions?.veloriaMode) {
        if (this.hudMsg) {
          this.hudMsg.text = w.gameOver
            ? '💀 Game Over\nPress SPACE to restart'
            : `🏆 ${w.message}\nPress SPACE to replay`;
        }
        if (this.keys.has(' ') && this.gdl) void this.loadGDL(this.gdl);
        return;
      }
    }

    const dtMs = this.app.ticker.deltaMS;
    const simOn = this.engineOptions?.shouldSimulate?.() ?? true;
    if (simOn) {
      stepSimulation(w, dtMs, this.gatherInput());
      for (const ev of w.events) {
        if (!playGdlSfx(this.gdlAudio, ev.type)) this.audio.play(ev.type);
      }
    }

    // Transition de scène : reconstruire les graphiques de la nouvelle scène
    if (w.sceneJustChanged) {
      w.sceneJustChanged = false;
      void this.buildScene();
      return;
    }

    this.render(dtMs);
    this.engineOptions?.afterRender?.(dtMs);
  };

  private isTopDownView(): boolean {
    if (!this.world || !this.gdl) return false;
    if (this.world.systems.includes('physics_topdown')) return true;
    const scene = this.gdl.scenes[this.world.sceneIndex] as { camera?: { mode?: string } };
    return scene?.camera?.mode === 'top_down';
  }

  private updateCamera(): void {
    if (!this.world || !this.app || !this.sceneGraph) return;
    const viewW = this.app.screen.width;
    const viewH = this.app.screen.height;
    const p = this.world.player;
    const veloriaActive = this.world.veloria != null && this.world.systems.includes('lane_runner');
    const mode = resolveCameraMode(this.cameraSpec, this.world.systems, veloriaActive);

    this.cameraState = updateCameraFollow(
      this.cameraState,
      p,
      {
        width: viewW,
        height: viewH,
        worldWidth: this.world.worldWidth,
        worldHeight: this.world.worldHeight,
      },
      this.cameraSpec,
      mode,
    );

    const laneShift = this.laneShiftPx();
    this.sceneGraph.stage.x = -this.cameraState.x;
    this.sceneGraph.stage.y = -this.cameraState.y;
    this.sceneGraph.parallaxBack.update(this.cameraState.x, this.cameraState.y, laneShift);
    this.sceneGraph.parallaxFront.update(this.cameraState.x, this.cameraState.y, laneShift);
  }

  private render(dtMs: number): void {
    if (!this.world) return;
    this.updateCamera();
    const w = this.world;
    const p = w.player;
    const dtSec = Math.min(dtMs / 1000, 0.05);

    // Ennemis
    const playerEntity = this.gdl?.entities.find((e) => e.id === 'player');
    const sortables: SortableEntity[] = [];

    const fp = enemyFingerprint(w.enemies);
    if (fp !== this.enemyPool.fingerprint && this.worldContainer && this.gdl && !this.enemySyncPending) {
      this.enemySyncPending = true;
      const atlas = (this.gdl.meta as { asset_atlas?: Record<string, string> })?.asset_atlas ?? {};
      void syncEnemyPool(this.worldContainer, w.enemies, atlas, this.enemyPool).finally(() => {
        this.enemySyncPending = false;
      });
    }

    const poolEntries = updateEnemyPoolDisplays(w.enemies, this.enemyPool, (y, h) =>
      this.perspectiveScale(y, h),
    );
    for (let i = 0; i < poolEntries.length; i++) {
      const enemy = w.enemies[i];
      const entry = poolEntries[i];
      if (!enemy || !entry) continue;
      const display = entry.sprite ?? entry.gfx;
      if (!display) continue;
      sortables.push({
        display,
        x: enemy.x,
        y: enemy.y,
        width: enemy.width,
        height: enemy.height,
        visible: enemy.alive,
      });
    }

    if (this.depthSpec.mode !== 'flat') {
      applyDepthSort(sortables, this.depthSpec);
    }

    // Collectibles
    for (let i = 0; i < this.collectibleGfx.length; i++) {
      const col = w.collectibles[i];
      const gfx = this.collectibleGfx[i];
      if (col && gfx) gfx.visible = !col.collected;
    }

    // HUD + messages
    this.drawHud();
    if (this.hudMsg) this.hudMsg.text = w.message;

    // Joueur
    const moving = Math.abs(p.vx) > 8;
    const playerPers = this.perspectiveScale(p.y, p.height);
    if (this.playerSkeletal && this.playerSkeletalWrap) {
      this.playerSkeletalWrap.x = p.x;
      this.playerSkeletalWrap.y = p.y;
      const baseY = Math.abs(this.playerSkeletalWrap.scale.y);
      this.playerSkeletalWrap.scale.y = baseY * playerPers;
      this.playerSkeletalWrap.scale.x = baseY * playerPers * (p.facing < 0 ? -1 : 1);
      const alpha = p.invincibleMs > 0 && Math.floor(p.invincibleMs / 80) % 2 === 0 ? 0.3 : 1;
      this.playerSkeletalWrap.alpha = alpha;
      this.playerSkeletalWrap.zIndex = sortKeyForEntity(
        { display: this.playerSkeletalWrap, x: p.x, y: p.y, width: p.width, height: p.height, depth: playerEntity?.depth },
        this.depthSpec,
      );
      this.rigPhase += dtSec;
      this.playerSkeletal.playPose(idlePosePhase(this.rigPhase));
      if (moving) {
        this.playerSkeletal.setBoneRotation('torso', Math.sin(this.rigPhase * 12) * 0.06);
      }
    } else if (this.playerSprite && this.spriteAnim) {
      this.playerSprite.x = p.x;
      this.playerSprite.y = p.y;
      this.playerSprite.scale.x = playerPers * (p.facing < 0 ? -1 : 1);
      this.playerSprite.scale.y = playerPers;
      if (p.facing < 0) this.playerSprite.x += p.width;
      const alpha = p.invincibleMs > 0 && Math.floor(p.invincibleMs / 80) % 2 === 0 ? 0.3 : 1;
      this.playerSprite.alpha = alpha;
      this.playerSprite.zIndex = sortKeyForEntity(
        { display: this.playerSprite, x: p.x, y: p.y, width: p.width, height: p.height, depth: playerEntity?.depth },
        this.depthSpec,
      );

      for (const ls of this.layerSprites) {
        ls.x = p.x + (p.width - ls.width) / 2;
        ls.y = p.y + ls.height * 0.1;
        ls.scale.x = this.playerSprite.scale.x;
        if (p.facing < 0) ls.x = p.x + p.width - (p.width - ls.width) / 2 - ls.width;
        ls.alpha = alpha;
      }

      let frameIdx = 0;
      if (moving && p.grounded) {
        this.spriteAnim.animTime += dtSec;
        frameIdx = Math.floor(this.spriteAnim.animTime * 8) % this.spriteAnim.frameCount;
      } else {
        this.spriteAnim.animTime = 0;
      }
      this.playerSprite.texture = new Texture({
        source: this.spriteAnim.source,
        frame: new Rectangle(frameIdx * this.spriteAnim.frameW, 0, this.spriteAnim.frameW, this.spriteAnim.frameH),
      });
    } else {
      this.drawFallback();
    }
  }

  private onKey(e: KeyboardEvent, down: boolean): void {
    const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'a', 'A', 'd', 'D', 'w', 'W', 's', 'S', '1', '2', '3'];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    if (down) {
      this.keys.add(e.key);
      if (this.world && ['1', '2', '3'].includes(e.key)) veloriaDraftKey(this.world, e.key);
    } else this.keys.delete(e.key);
  }

  destroy(): void {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    this.app?.ticker.remove(this.tick);
    this.tilemapLayer?.dispose();
    disposeSceneGraph(this.sceneGraph);
    this.sceneGraph = null;
    this.app?.destroy(true, { children: true });
    this.app = null;
    this.keys.clear();
    this.audio.dispose();
    disposeGdlAudio(this.gdlAudio);
  }
}

export { VeloriaEngine, type VeloriaEngineOptions } from './veloria/veloria-engine.js';
