/**
 * VeloriaEngine — expérience GACHA HD complète sur @ellipse/engine Pixi.
 */
import type { Application } from 'pixi.js';
import type { GameDefinition } from '@ellipse/shared';
import { applyScene } from '../sim/world.js';
import {
  activateVeloriaAbility,
  moveVeloriaLane,
  resetVeloriaRun,
  type VeloriaAbilitySlot,
} from '../sim/veloria-survival.js';
import type { EllipseEngine, EngineOptions } from '../index.js';
import { VeloriaHudLayer } from './veloria-hud.js';
import { VeloriaHazardLayer } from './veloria-hazard.js';
import { VeloriaScreenLayer, loadTexture, type VeloriaScreenId } from './veloria-screens.js';
import { VeloriaCombatFxLayer } from './veloria-combat-fx.js';

export interface VeloriaEngineOptions extends Omit<EngineOptions, 'shouldSimulate' | 'afterRender' | 'veloriaMode'> {
  hudOverlayUrl?: string;
  hubBgUrl?: string;
  heroSpriteUrl?: string;
}

export class VeloriaEngine {
  private core: EllipseEngine | null = null;
  private gdl: GameDefinition | null = null;
  private levelIndex = 0;
  private screen: VeloriaScreenId = 'hub';
  private invokeShown = false;
  private score = 0;
  private bannerTimer = 0;
  private hud: VeloriaHudLayer;
  private hazard: VeloriaHazardLayer | null = null;
  private screens: VeloriaScreenLayer;
  private combatFx: VeloriaCombatFxLayer;
  private heroTex: import('pixi.js').Texture | null = null;
  private hubTex: import('pixi.js').Texture | null = null;
  private viewW = 720;
  private viewH = 1280;
  private keyHandlerDown: ((e: KeyboardEvent) => void) | null = null;
  private keyHandlerUp: ((e: KeyboardEvent) => void) | null = null;
  private pointerStart: { x: number; y: number } | null = null;
  private pointerHandlerDown: ((e: PointerEvent) => void) | null = null;
  private pointerHandlerUp: ((e: PointerEvent) => void) | null = null;

  constructor() {
    this.hud = new VeloriaHudLayer(720, 1280);
    this.screens = new VeloriaScreenLayer(720, 1280);
    this.combatFx = new VeloriaCombatFxLayer(720, 1280);
  }

  get application(): Application | null {
    return this.core?.getApplication() ?? null;
  }

  async init(options: VeloriaEngineOptions): Promise<void> {
    const { EllipseEngine: Engine } = await import('../index.js');
    this.core = new Engine();
    this.viewW = options.width ?? 720;
    this.viewH = options.height ?? 1280;
    this.hud = new VeloriaHudLayer(this.viewW, this.viewH);
    this.screens = new VeloriaScreenLayer(this.viewW, this.viewH);
    this.combatFx = new VeloriaCombatFxLayer(this.viewW, this.viewH);

    await this.core.init({
      ...options,
      veloriaMode: true,
      shouldSimulate: () => this.screen === 'combat' && !this.isDraftActive(),
      afterRender: (dtMs) => this.onAfterRender(dtMs),
    });

    const app = this.core.getApplication();
    if (!app) return;
    app.stage.sortableChildren = true;
    this.attachOverlayLayers();
    if (options.hudOverlayUrl) await this.hud.loadOverlay(options.hudOverlayUrl);
    if (options.heroSpriteUrl) this.heroTex = await loadTexture(options.heroSpriteUrl);
    if (options.hubBgUrl) this.hubTex = await loadTexture(options.hubBgUrl);

    this.bindKeys();
    this.bindPointer();
  }

  async loadGDL(gdl: GameDefinition): Promise<void> {
    if (!this.core) return;
    this.gdl = gdl;
    this.levelIndex = 0;
    this.screen = 'hub';
    this.score = 0;
    await this.core.loadGDL(gdl);
    this.attachOverlayLayers();
    this.setupHazardLayer();
    this.refreshOverlays();
  }

  async switchLevel(index: number): Promise<void> {
    if (!this.gdl?.scenes[index] || !this.core) return;
    this.levelIndex = index;
    const world = this.core.getSimWorld();
    if (!world) return;
    applyScene(world, index);
    resetVeloriaRun(world);
    this.score = 0;
    await this.core.rebuildScene();
    this.attachOverlayLayers();
    this.setupHazardLayer();
    this.screen = 'combat';
    this.refreshOverlays();
  }

  private setupHazardLayer(): void {
    this.hazard?.dispose();
    this.hazard = null;
    const scene = this.currentScene();
    const layout = scene?.layout as {
      lane_meta?: { lanes?: { id: string; center_x: number }[] };
      zones?: { id: string; x: number; y: number; w: number; h: number }[];
      ground_y?: number;
    } | undefined;
    if (!layout?.lane_meta?.lanes || !this.core) return;
    const meta = this.gdl?.meta as { hazard_scripts?: Record<string, unknown> } | undefined;
    const script = meta?.hazard_scripts?.[scene?.id ?? ''] ?? meta?.hazard_scripts?.default;
    this.hazard = new VeloriaHazardLayer({
      lanes: layout.lane_meta.lanes,
      zones: layout.zones ?? [],
      groundY: layout.ground_y ?? 973,
      script: script as import('./veloria-hazard.js').HazardScriptLike,
    });
    const world = this.core.getWorldContainer();
    if (world) world.addChild(this.hazard.root);
  }

  private currentScene() {
    return this.gdl?.scenes[this.levelIndex];
  }

  private isDraftActive(): boolean {
    return !!this.core?.getSimWorld()?.veloria?.draftActive;
  }

  private bindKeys(): void {
    this.keyHandlerDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (this.screen === 'blessing' && ['1', '2', '3'].includes(k)) {
        e.preventDefault();
        this.core?.handleVeloriaDraftKey(k);
        if (!this.isDraftActive()) {
          this.screen = 'combat';
          this.bannerTimer = 1.8;
        }
        return;
      }
      if (k === 'enter' || k === ' ') {
        e.preventDefault();
        this.onConfirm();
        return;
      }
      if (k === 'escape') {
        if (this.screen !== 'hub') {
          this.screen = 'hub';
          this.refreshOverlays();
        }
        return;
      }
      const abilitySlot = abilitySlotForKey(k);
      if (this.screen === 'combat' && abilitySlot != null) {
        e.preventDefault();
        this.activateAbility(abilitySlot);
        return;
      }
      if (this.screen === 'hub' && k >= '1' && k <= '6') {
        const idx = parseInt(k, 10) - 1;
        void this.switchLevel(idx).then(() => this.startRun(false));
      }
    };
    this.keyHandlerUp = (e: KeyboardEvent) => {
      void e;
    };
    window.addEventListener('keydown', this.keyHandlerDown);
    window.addEventListener('keyup', this.keyHandlerUp);
  }

  private onConfirm(): void {
    if (this.screen === 'hub') this.startRun(true);
    else if (this.screen === 'invoke') {
      this.screen = 'combat';
      this.bannerTimer = 1.5;
    } else if (this.screen === 'game_over') {
      this.startRun(false);
    } else if (this.screen === 'victory') {
      this.screen = 'hub';
      this.refreshOverlays();
    }
  }

  private startRun(fromHub: boolean): void {
    const world = this.core?.getSimWorld();
    if (!world) return;
    resetVeloriaRun(world);
    this.score = 0;
    if (fromHub && !this.invokeShown) {
      this.screen = 'invoke';
      this.invokeShown = true;
    } else {
      this.screen = 'combat';
      this.bannerTimer = 1.5;
    }
    this.refreshOverlays();
  }

  private activateAbility(slot: VeloriaAbilitySlot): void {
    const world = this.core?.getSimWorld();
    if (!world || !activateVeloriaAbility(world, slot)) return;
    this.combatFx.triggerAbility(slot);
    this.bannerTimer = slot === 3 ? 1.2 : 0.45;
  }

  private bindPointer(): void {
    const canvas = this.core?.getApplication()?.canvas;
    if (!canvas) return;
    this.pointerHandlerDown = (e: PointerEvent) => {
      const point = this.pointerPoint(e);
      if (!point) return;
      if (this.screen === 'blessing') {
        const pick = this.blessingAt(point.x, point.y);
        if (pick != null) {
          this.core?.handleVeloriaDraftKey(String(pick + 1));
          if (!this.isDraftActive()) {
            this.screen = 'combat';
            this.bannerTimer = 1.8;
          }
          this.pointerStart = null;
          e.preventDefault();
        }
        return;
      }
      const skill = this.skillAt(point.x, point.y);
      if (this.screen === 'combat' && skill != null) {
        this.activateAbility(skill);
        this.pointerStart = null;
        e.preventDefault();
        return;
      }
      this.pointerStart = point;
    };
    this.pointerHandlerUp = (e: PointerEvent) => {
      const start = this.pointerStart;
      const end = this.pointerPoint(e);
      this.pointerStart = null;
      if (!start || !end) return;
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      if (this.screen !== 'combat') {
        if (Math.hypot(dx, dy) < 32) this.onConfirm();
        e.preventDefault();
        return;
      }
      const direction: -1 | 1 = Math.abs(dx) >= 28 ? (dx < 0 ? -1 : 1) : end.x < this.viewW / 2 ? -1 : 1;
      const world = this.core?.getSimWorld();
      if (world) moveVeloriaLane(world, direction);
      e.preventDefault();
    };
    canvas.addEventListener('pointerdown', this.pointerHandlerDown);
    canvas.addEventListener('pointerup', this.pointerHandlerUp);
  }

  private pointerPoint(e: PointerEvent): { x: number; y: number } | null {
    const canvas = this.core?.getApplication()?.canvas;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: ((e.clientX - rect.left) / rect.width) * this.viewW,
      y: ((e.clientY - rect.top) / rect.height) * this.viewH,
    };
  }

  private skillAt(x: number, y: number): VeloriaAbilitySlot | null {
    if (x < this.viewW - 150) return null;
    for (let i = 0; i < 4; i++) {
      const cy = 450 + i * 112;
      const radius = i === 3 ? 66 : 56;
      if (Math.abs(y - cy) <= radius) return i as VeloriaAbilitySlot;
    }
    return null;
  }

  private blessingAt(x: number, y: number): number | null {
    const picks = this.core?.getSimWorld()?.veloria?.draftOptions ?? [];
    if (!picks.length || y < this.viewH * 0.42 || y > this.viewH * 0.42 + 260) return null;
    const cardW = 200;
    const gap = 16;
    const total = picks.length * cardW + (picks.length - 1) * gap;
    const left = (this.viewW - total) / 2;
    for (let i = 0; i < picks.length; i++) {
      const cardLeft = left + i * (cardW + gap);
      if (x >= cardLeft && x <= cardLeft + cardW) return i;
    }
    return null;
  }

  private onAfterRender(dtMs: number): void {
    const dt = dtMs / 1000;
    const world = this.core?.getSimWorld();
    const scene = this.currentScene();
    const veloria = (scene as { veloria?: { encounters?: { total_waves?: number } } })?.veloria;
    this.combatFx.update(world ?? null, dt, this.screen === 'combat' || this.screen === 'blessing');

    if (world?.gameOver && (this.screen === 'combat' || this.screen === 'blessing')) {
      this.screen = 'game_over';
      this.score = world.player.score;
    } else if (world?.levelWon && (this.screen === 'combat' || this.screen === 'blessing')) {
      this.screen = 'victory';
      this.score = world.player.score;
    } else if (world?.veloria?.draftActive && this.screen === 'combat') {
      this.screen = 'blessing';
    } else if (!world?.veloria?.draftActive && this.screen === 'blessing') {
      this.screen = 'combat';
    }

    if (this.screen === 'combat' && world) {
      if (this.bannerTimer > 0) this.bannerTimer -= dt;
      this.hazard?.update(world.veloria, dt);
      const v = world.veloria;
      const boss = world.enemies.find((enemy) => enemy.alive && (enemy as { isBoss?: boolean }).isBoss) as
        | { hp?: number; maxHp?: number; phase?: number; kind?: string }
        | undefined;
      this.hud.update({
        visible: true,
        wave: v?.waveNumber ?? 1,
        totalWaves: veloria?.encounters?.total_waves ?? 12,
        timerSec: Math.max(0, ((v?.runDurationMs ?? 180_000) - (v?.runElapsedMs ?? 0)) / 1_000),
        arenaTitle: (scene as { title?: string })?.title,
        hp: world.player.health,
        maxHp: world.player.maxHealth,
        combo: v?.combo ?? 0,
        ultReady: (v?.ultimateCharge ?? 0) >= 100,
        ultimateCharge: v?.ultimateCharge ?? 0,
        skillCooldownsMs: v?.skillCooldownsMs ?? [0, 0, 0, 0],
        guardCharges: v?.guardCharges ?? 0,
        bossHp: boss?.hp,
        bossMaxHp: boss?.maxHp,
        bossPhase: boss?.phase,
        bossName: boss?.kind === 'bourreau'
          ? 'BOURREAU DU CRÉPUSCULE'
          : boss?.kind?.replaceAll('_', ' ').toUpperCase(),
      });
    } else {
      this.hud.update({ visible: false, wave: 0, totalWaves: 0, timerSec: 0, hp: 0, maxHp: 1, combo: 0 });
    }

    this.screens.update({
      screen: this.screen,
      title: this.gdl?.meta?.title ?? 'Veloria',
      score: this.score,
      arenaTitle: (scene as { title?: string })?.title,
      blessingPicks: this.screen === 'blessing' ? world?.veloria?.draftOptions : undefined,
      heroTexture: this.heroTex,
      bgTexture: this.screen === 'hub' || this.screen === 'invoke' ? this.hubTex : null,
      dtSec: dt,
    });
  }

  private refreshOverlays(): void {
    this.onAfterRender(0);
  }

  private attachOverlayLayers(): void {
    const app = this.core?.getApplication();
    if (!app) return;
    app.stage.sortableChildren = true;
    app.stage.addChild(this.combatFx.root, this.hud.root, this.screens.root);
  }

  destroy(): void {
    if (this.keyHandlerDown) window.removeEventListener('keydown', this.keyHandlerDown);
    if (this.keyHandlerUp) window.removeEventListener('keyup', this.keyHandlerUp);
    const canvas = this.core?.getApplication()?.canvas;
    if (canvas && this.pointerHandlerDown) canvas.removeEventListener('pointerdown', this.pointerHandlerDown);
    if (canvas && this.pointerHandlerUp) canvas.removeEventListener('pointerup', this.pointerHandlerUp);
    this.hud.dispose();
    this.combatFx.dispose();
    this.hazard?.dispose();
    this.screens.dispose();
    this.core?.destroy();
    this.core = null;
  }
}

function abilitySlotForKey(key: string): VeloriaAbilitySlot | null {
  if (key === 'z') return 0;
  if (key === 'x') return 1;
  if (key === 'c') return 2;
  if (key === 'v') return 3;
  return null;
}
