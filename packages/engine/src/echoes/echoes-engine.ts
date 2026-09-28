import { Application, Assets, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import type { GameDefinition } from '@ellipse/shared';
import {
  createGdlAudioBus,
  disposeGdlAudio,
  loadGdlAudio,
  playGdlSfx,
  type GdlAudioBus,
} from '../audio/gdl-audio.js';
import {
  advanceEchoesWorld,
  chooseEchoesWeapon,
  createEchoesWorldFromGdl,
  drainEchoesEvents,
  echoesBoss,
  restartEchoesWorld,
  retryEchoesWorld,
  type EchoesEnemy,
  type EchoesEnemyKind,
  type EchoesEvent,
  type EchoesInput,
  type EchoesProjectile,
  type EchoesWorld,
} from '../sim/echoes-platformer.js';

export type EchoesScreen = 'menu' | 'intro' | 'playing' | 'weapon_choice' | 'boss' | 'victory' | 'defeat';

export interface EchoesEngineOptions {
  container: HTMLElement;
  width?: number;
  height?: number;
  assetAtlas?: Record<string, string>;
  showTouchControls?: boolean;
  debugCollision?: boolean;
  seed?: number;
  onEvent?: (event: EchoesEvent) => void;
}

type TouchControl = 'left' | 'right' | 'jump' | 'attack' | 'dodge' | 'interact';

const COLORS = {
  ink: 0x09070d,
  panel: 0x120f18,
  gold: 0xc9a66b,
  goldLight: 0xf0d9a6,
  violet: 0x8b4bb8,
  violetDark: 0x4a2a6b,
  cyan: 0x54d8e6,
  magenta: 0xe565a8,
  moss: 0x2b6b5c,
  danger: 0xc34258,
} as const;

const ENEMY_ASSET_KEYS: Record<EchoesEnemyKind, string[]> = {
  sporeling: ['sporeling', 'enemy_sporeling', 'sporeling_idle'],
  rampore: ['rampore', 'enemy_rampore'],
  porteur_sporeal: ['porteur_sporeal', 'enemy_porteur_sporeal', 'spore_drone'],
  chevalier_fongique: ['chevalier_fongique', 'enemy_chevalier_fongique'],
  moussu_furieux: ['moussu_furieux', 'enemy_moussu_furieux'],
  root_guardian_boss: ['root_guardian_boss', 'boss_phase_1', 'boss_guardian'],
};

const CONTROL_LABELS: Record<TouchControl, string> = {
  left: '◀',
  right: '▶',
  jump: 'SAUT',
  attack: 'FRAPPE',
  dodge: 'ESQUIVE',
  interact: 'ÉCHO',
};

export class EchoesEngine {
  private app: Application | null = null;
  private options: EchoesEngineOptions | null = null;
  private gdl: GameDefinition | null = null;
  private world: EchoesWorld | null = null;
  private screen: EchoesScreen = 'menu';
  private viewW = 1280;
  private viewH = 720;
  private cameraX = 0;
  private worldRoot = new Container();
  private sceneryRoot = new Container();
  private actorRoot = new Container();
  private fxRoot = new Container();
  private uiRoot = new Container();
  private overlayRoot = new Container();
  private background: Sprite | null = null;
  private menuBackground: Sprite | null = null;
  private staticWorld = new Graphics();
  private dynamicFx = new Graphics();
  private hero: Sprite | Graphics | null = null;
  private enemyViews = new Map<string, Sprite | Graphics>();
  private enemyTextures = new Map<EchoesEnemyKind, Texture>();
  private bossPhaseTextures = new Map<number, Texture>();
  private heroTexture: Texture | null = null;
  private atlas: Record<string, string> = {};
  private hud = new Graphics();
  private hudTitle = new Text({ text: '', style: { fill: COLORS.goldLight, fontFamily: 'Georgia, serif', fontSize: 19 } });
  private hudStats = new Text({ text: '', style: { fill: 0xffffff, fontFamily: 'system-ui, sans-serif', fontSize: 15 } });
  private objective = new Text({
    text: '',
    style: { fill: COLORS.goldLight, fontFamily: 'Georgia, serif', fontSize: 17, align: 'center' },
  });
  private bossHud = new Graphics();
  private bossLabel = new Text({
    text: '',
    style: { fill: COLORS.goldLight, fontFamily: 'Georgia, serif', fontSize: 16, align: 'center' },
  });
  private message = new Text({
    text: '',
    style: { fill: COLORS.goldLight, fontFamily: 'Georgia, serif', fontSize: 22, align: 'center', fontWeight: 'bold' },
  });
  private messageMs = 0;
  private visualTime = 0;
  private overlayShade = new Graphics();
  private overlayFrame = new Graphics();
  private overlayTitle = new Text({
    text: '',
    style: { fill: COLORS.goldLight, fontFamily: 'Georgia, serif', fontSize: 46, align: 'center', fontWeight: 'bold' },
  });
  private overlayBody = new Text({
    text: '',
    style: { fill: 0xf0e8f8, fontFamily: 'Georgia, serif', fontSize: 22, align: 'center', lineHeight: 32, wordWrap: true, wordWrapWidth: 760 },
  });
  private overlayPrompt = new Text({
    text: '',
    style: { fill: COLORS.cyan, fontFamily: 'system-ui, sans-serif', fontSize: 17, align: 'center', fontWeight: 'bold' },
  });
  private touchLayer = new Container();
  private keys = new Set<string>();
  private edge = { jump: false, attack: false, dodge: false, interact: false };
  private touchPointers = new Map<number, TouchControl>();
  private touchHeld = new Set<TouchControl>();
  private previousGamepadButtons: boolean[] = [];
  private audio: GdlAudioBus = createGdlAudioBus();
  private weaponChoice: 0 | 1 = 0;
  private weaponChoiceSeen = false;
  private keyDownHandler = (event: KeyboardEvent): void => this.onKeyDown(event);
  private keyUpHandler = (event: KeyboardEvent): void => this.onKeyUp(event);
  private pointerDownHandler = (event: PointerEvent): void => this.onPointerDown(event);
  private pointerUpHandler = (event: PointerEvent): void => this.onPointerUp(event);

  get application(): Application | null {
    return this.app;
  }

  getWorld(): EchoesWorld | null {
    return this.world;
  }

  getScreen(): EchoesScreen {
    return this.screen;
  }

  async init(options: EchoesEngineOptions): Promise<void> {
    this.options = options;
    this.viewW = options.width ?? 1280;
    this.viewH = options.height ?? 720;
    this.app = new Application();
    await this.app.init({
      width: this.viewW,
      height: this.viewH,
      backgroundColor: COLORS.ink,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      powerPreference: 'high-performance',
    });
    this.app.canvas.style.width = '100%';
    this.app.canvas.style.height = '100%';
    this.app.canvas.style.objectFit = 'contain';
    this.app.canvas.style.touchAction = 'none';
    options.container.appendChild(this.app.canvas);

    this.worldRoot.addChild(this.sceneryRoot, this.actorRoot, this.fxRoot);
    this.uiRoot.addChild(this.hud, this.hudTitle, this.hudStats, this.objective, this.bossHud, this.bossLabel, this.message, this.touchLayer);
    this.overlayRoot.addChild(this.overlayShade, this.overlayFrame, this.overlayTitle, this.overlayBody, this.overlayPrompt);
    this.app.stage.addChild(this.worldRoot, this.uiRoot, this.overlayRoot);
    this.layoutUi();
    this.drawTouchControls();

    window.addEventListener('keydown', this.keyDownHandler);
    window.addEventListener('keyup', this.keyUpHandler);
    this.app.canvas.addEventListener('pointerdown', this.pointerDownHandler);
    this.app.canvas.addEventListener('pointerup', this.pointerUpHandler);
    this.app.canvas.addEventListener('pointercancel', this.pointerUpHandler);
    this.app.canvas.addEventListener('pointerleave', this.pointerUpHandler);
    this.app.ticker.add(this.tick);
  }

  async loadGDL(gdl: GameDefinition): Promise<void> {
    if (!this.app) throw new Error('EchoesEngine.init() doit être appelé avant loadGDL().');
    this.gdl = gdl;
    this.world = createEchoesWorldFromGdl(gdl, this.options?.seed);
    const metaAtlas = ((gdl.meta as unknown as { asset_atlas?: Record<string, string> }).asset_atlas ?? {});
    this.atlas = { ...metaAtlas, ...(this.options?.assetAtlas ?? {}) };
    this.screen = 'menu';
    this.weaponChoice = 0;
    this.weaponChoiceSeen = false;
    this.cameraX = this.cameraTarget();
    disposeGdlAudio(this.audio);
    this.audio = createGdlAudioBus();
    await loadGdlAudio(this.audio, gdl as GameDefinition & { audio?: { bgm?: string; sfx?: Record<string, string> } });
    await this.loadTextures();
    this.buildWorldViews();
    this.refreshOverlay();
    this.renderFrame(0);
  }

  private asset(...keys: string[]): string | undefined {
    for (const key of keys) if (this.atlas[key]) return this.atlas[key];
    return undefined;
  }

  private async loadOptional(url?: string): Promise<Texture | null> {
    if (!url) return null;
    try {
      return await Assets.load<Texture>(url);
    } catch {
      return null;
    }
  }

  private async loadTextures(): Promise<void> {
    if (!this.gdl) return;
    this.enemyTextures.clear();
    this.bossPhaseTextures.clear();
    const scene = this.gdl.scenes[0] as { background?: { image?: string } } | undefined;
    const player = this.gdl.entities.find((entity) => entity.id === 'player') as { assets?: { sprite?: string } } | undefined;
    const backgroundUrl = this.asset('echoes_background', 'level_01_background', 'background') ?? scene?.background?.image;
    const heroUrl = this.asset('echoes_hero', 'hero', 'player') ?? player?.assets?.sprite;
    const [backgroundTexture, heroTexture, menuTexture] = await Promise.all([
      this.loadOptional(backgroundUrl),
      this.loadOptional(heroUrl),
      this.loadOptional(this.asset('menu_keyart')),
    ]);
    this.sceneryRoot.removeChildren();
    this.background = backgroundTexture ? new Sprite(backgroundTexture) : null;
    if (this.background && this.world) {
      this.background.width = this.world.width;
      this.background.height = this.world.height;
      this.sceneryRoot.addChild(this.background);
    }
    this.heroTexture = heroTexture;
    if (this.menuBackground) {
      this.overlayRoot.removeChild(this.menuBackground);
      this.menuBackground.destroy();
      this.menuBackground = null;
    }
    if (menuTexture) {
      this.menuBackground = new Sprite(menuTexture);
      this.menuBackground.anchor.set(0.5);
      this.menuBackground.x = this.viewW / 2;
      this.menuBackground.y = this.viewH / 2;
      const scale = Math.max(this.viewW / menuTexture.width, this.viewH / menuTexture.height);
      this.menuBackground.scale.set(scale);
      this.overlayRoot.addChildAt(this.menuBackground, 0);
    }

    await Promise.all((Object.keys(ENEMY_ASSET_KEYS) as EchoesEnemyKind[]).map(async (kind) => {
      const texture = await this.loadOptional(this.asset(...ENEMY_ASSET_KEYS[kind]));
      if (texture) this.enemyTextures.set(kind, texture);
    }));
    await Promise.all([1, 2, 3].map(async (phase) => {
      const texture = await this.loadOptional(this.asset(`boss_phase_${phase}`, `root_guardian_phase_${phase}`));
      if (texture) this.bossPhaseTextures.set(phase, texture);
    }));
  }

  private buildWorldViews(): void {
    if (!this.world) return;
    this.actorRoot.removeChildren();
    this.fxRoot.removeChildren();
    this.fxRoot.addChild(this.dynamicFx);
    this.enemyViews.clear();
    this.hero = this.heroTexture ? new Sprite(this.heroTexture) : this.fallbackHero();
    this.actorRoot.addChild(this.hero);

    for (const enemy of this.world.enemies) {
      const texture = this.enemyTextures.get(enemy.kind) ?? (enemy.kind === 'root_guardian_boss' ? this.bossPhaseTextures.get(1) : undefined);
      const view = texture ? new Sprite(texture) : this.fallbackEnemy(enemy);
      this.enemyViews.set(enemy.id, view);
      this.actorRoot.addChild(view);
    }
    this.drawStaticWorld();
  }

  private fallbackHero(): Graphics {
    const graphics = new Graphics();
    graphics.moveTo(0, -68).lineTo(20, -45).lineTo(15, -8).lineTo(0, 0).lineTo(-15, -8).lineTo(-20, -45).closePath();
    graphics.fill(COLORS.violetDark);
    graphics.stroke({ color: COLORS.cyan, width: 3 });
    graphics.circle(0, -51, 7).fill(COLORS.cyan);
    return graphics;
  }

  private fallbackEnemy(enemy: EchoesEnemy): Graphics {
    const graphics = new Graphics();
    if (enemy.kind === 'root_guardian_boss') {
      graphics.ellipse(0, -94, 70, 32).fill(COLORS.violetDark).stroke({ color: COLORS.magenta, width: 4 });
      graphics.roundRect(-46, -98, 92, 98, 24).fill(0x211526).stroke({ color: COLORS.violet, width: 3 });
      graphics.circle(0, -48, 13).fill(COLORS.magenta);
    } else {
      graphics.ellipse(0, -34, 28, 15).fill(enemy.kind === 'moussu_furieux' ? COLORS.moss : COLORS.violetDark);
      graphics.roundRect(-14, -35, 28, 35, 12).fill(0x2b1b34);
      graphics.circle(-6, -25, 3).fill(COLORS.magenta);
      graphics.circle(6, -25, 3).fill(COLORS.magenta);
    }
    return graphics;
  }

  private drawStaticWorld(): void {
    if (!this.world) return;
    const staticLayer = this.staticWorld;
    staticLayer.clear();
    if (this.options?.debugCollision) {
      for (const platform of this.world.platforms) {
        staticLayer.rect(platform.x, platform.y, platform.w, platform.h).fill({ color: COLORS.violetDark, alpha: 0.18 });
        staticLayer.stroke({ color: COLORS.cyan, alpha: 0.45, width: 1 });
      }
    }
    for (const hazard of this.world.hazards) {
      const teeth = Math.max(2, Math.floor(hazard.w / 18));
      for (let index = 0; index < teeth; index++) {
        const left = hazard.x + (index * hazard.w) / teeth;
        const right = hazard.x + ((index + 1) * hazard.w) / teeth;
        staticLayer.moveTo(left, hazard.y + hazard.h).lineTo((left + right) / 2, hazard.y).lineTo(right, hazard.y + hazard.h).closePath();
      }
      staticLayer.fill({ color: COLORS.danger, alpha: 0.86 });
    }
    for (const checkpoint of this.world.checkpoints) {
      staticLayer.circle(checkpoint.x, checkpoint.y + 10, 24).stroke({ color: COLORS.cyan, width: 3, alpha: 0.75 });
      staticLayer.circle(checkpoint.x, checkpoint.y + 10, 7).fill({ color: COLORS.cyan, alpha: 0.8 });
    }
    this.sceneryRoot.addChild(staticLayer);
  }

  private layoutUi(): void {
    this.hudTitle.x = 24;
    this.hudTitle.y = 20;
    this.hudStats.x = 25;
    this.hudStats.y = 50;
    this.objective.anchor.set(0.5, 0);
    this.objective.x = this.viewW / 2;
    this.objective.y = 20;
    this.bossLabel.anchor.set(0.5, 0);
    this.bossLabel.x = this.viewW / 2;
    this.bossLabel.y = 63;
    this.message.anchor.set(0.5);
    this.message.x = this.viewW / 2;
    this.message.y = 132;
    this.overlayTitle.anchor.set(0.5);
    this.overlayTitle.x = this.viewW / 2;
    this.overlayTitle.y = this.viewH * 0.27;
    this.overlayBody.anchor.set(0.5);
    this.overlayBody.x = this.viewW / 2;
    this.overlayBody.y = this.viewH * 0.49;
    this.overlayPrompt.anchor.set(0.5);
    this.overlayPrompt.x = this.viewW / 2;
    this.overlayPrompt.y = this.viewH * 0.77;
  }

  private drawTouchControls(): void {
    this.touchLayer.removeChildren();
    const controls: Array<{ id: TouchControl; x: number; y: number; radius: number }> = [
      { id: 'left', x: 84, y: this.viewH - 88, radius: 47 },
      { id: 'right', x: 194, y: this.viewH - 88, radius: 47 },
      { id: 'interact', x: this.viewW - 478, y: this.viewH - 76, radius: 40 },
      { id: 'dodge', x: this.viewW - 354, y: this.viewH - 90, radius: 46 },
      { id: 'jump', x: this.viewW - 224, y: this.viewH - 112, radius: 50 },
      { id: 'attack', x: this.viewW - 92, y: this.viewH - 82, radius: 56 },
    ];
    for (const control of controls) {
      const circle = new Graphics();
      circle.circle(control.x, control.y, control.radius + 5).fill({ color: COLORS.ink, alpha: 0.5 });
      circle.stroke({ color: COLORS.gold, width: 4, alpha: 0.34 });
      circle.circle(control.x, control.y, control.radius).fill({ color: control.id === 'attack' ? COLORS.violetDark : COLORS.panel, alpha: 0.64 });
      circle.stroke({ color: control.id === 'attack' ? COLORS.magenta : COLORS.cyan, width: 2.5, alpha: 0.78 });
      circle.circle(control.x - control.radius * 0.22, control.y - control.radius * 0.24, control.radius * 0.36)
        .fill({ color: 0xffffff, alpha: 0.045 });
      const label = new Text({
        text: CONTROL_LABELS[control.id],
        style: { fill: 0xffffff, fontFamily: 'system-ui, sans-serif', fontSize: control.id === 'left' || control.id === 'right' ? 25 : 12, fontWeight: 'bold' },
      });
      label.anchor.set(0.5);
      label.x = control.x;
      label.y = control.y;
      this.touchLayer.addChild(circle, label);
    }
  }

  private tick = (): void => {
    if (!this.app || !this.world) return;
    const dtMs = Math.min(this.app.ticker.deltaMS, 100);
    this.pollGamepad();
    if (this.screen === 'playing' || this.screen === 'boss') {
      const input = this.gatherInput();
      advanceEchoesWorld(this.world, dtMs, input);
      this.clearEdges();
      for (const event of drainEchoesEvents(this.world)) this.handleEvent(event);
      this.updateScreenFromWorld();
    }
    this.renderFrame(dtMs);
  };

  private gatherInput(): EchoesInput {
    const left = this.keys.has('arrowleft') || this.keys.has('a') || this.keys.has('q') || this.keys.has('gamepad-left') || this.touchHeld.has('left');
    const right = this.keys.has('arrowright') || this.keys.has('d') || this.keys.has('gamepad-right') || this.touchHeld.has('right');
    const jumpHeld = this.keys.has(' ') || this.keys.has('arrowup') || this.keys.has('w') || this.keys.has('z') || this.touchHeld.has('jump');
    return {
      moveX: (right ? 1 : 0) - (left ? 1 : 0),
      jumpHeld,
      jumpPressed: this.edge.jump,
      attackPressed: this.edge.attack,
      dodgePressed: this.edge.dodge,
      interactPressed: this.edge.interact,
    };
  }

  private clearEdges(): void {
    this.edge.jump = false;
    this.edge.attack = false;
    this.edge.dodge = false;
    this.edge.interact = false;
  }

  private updateScreenFromWorld(): void {
    if (!this.world) return;
    if (this.world.status === 'game_over') this.setScreen('defeat');
    else if (this.world.status === 'victory') this.setScreen('victory');
    else if (this.world.bossEngaged && !this.world.bossDefeated) this.setScreen('boss');
    else if (
      !this.weaponChoiceSeen &&
      !this.world.selectedWeapon &&
      this.world.activeZoneId === 'weapon_trial' &&
      this.world.collectibles.some((item) =>
        item.type === 'weapon_echo' && Math.abs(item.x - (this.world?.player.x ?? 0)) < 135
      )
    ) {
      this.weaponChoiceSeen = true;
      this.setScreen('weapon_choice');
    } else if (this.screen === 'boss' && this.world.bossDefeated) this.setScreen('playing');
  }

  private handleEvent(event: EchoesEvent): void {
    this.options?.onEvent?.(event);
    const audioKey: Partial<Record<EchoesEvent['type'], string>> = {
      enemy_defeated: 'hit',
      enemy_hurt: 'hit',
      player_hurt: 'hurt',
      game_over: 'defeat',
      victory: 'victory',
      weapon_chosen: 'collect',
    };
    playGdlSfx(this.audio, audioKey[event.type] ?? event.type);
    const labels: Partial<Record<EchoesEvent['type'], string>> = {
      checkpoint: 'ÉCHO RESTAURÉ',
      weapon_chosen: event.data?.weapon === 'spore_hammer' ? 'MARTEAU SPORÉAL LIÉ' : 'ÉPÉE LONGUE LIÉE',
      boss_engaged: 'LE GARDIEN DES RACINES S’ÉVEILLE',
      boss_phase: `PHASE ${event.data?.phase ?? ''}`,
      boss_defeated: 'LE RÉSEAU EST LIBÉRÉ',
      goal_locked: 'LA SORTIE ATTEND LA CHUTE DU GARDIEN',
      collect: '+ ÉCHO',
    };
    const label = labels[event.type];
    if (label) {
      this.message.text = label;
      this.messageMs = event.type === 'boss_engaged' || event.type === 'boss_phase' ? 1_900 : 1_150;
    }
  }

  private setScreen(screen: EchoesScreen): void {
    if (this.screen === screen) return;
    this.screen = screen;
    this.clearEdges();
    this.refreshOverlay();
  }

  private refreshOverlay(): void {
    const visible = !['playing', 'boss'].includes(this.screen);
    this.overlayRoot.visible = visible;
    if (!visible) return;
    if (this.menuBackground) this.menuBackground.visible = this.screen === 'menu';
    const exactMenu = this.screen === 'menu' && !!this.menuBackground;
    this.overlayFrame.visible = !exactMenu;
    this.overlayTitle.visible = !exactMenu;
    this.overlayBody.visible = !exactMenu;
    this.overlayPrompt.visible = !exactMenu;
    const shadeAlpha = exactMenu ? 0 : this.screen === 'weapon_choice' ? 0.86 : 0.93;
    this.overlayShade.clear().rect(0, 0, this.viewW, this.viewH).fill({ color: COLORS.ink, alpha: shadeAlpha });
    this.overlayFrame.clear().roundRect(32, 28, this.viewW - 64, this.viewH - 56, 16).stroke({ color: COLORS.gold, width: 2, alpha: 0.72 });
    if (this.screen === 'menu') {
      this.overlayTitle.text = 'ECHOES OF THE\nMUSHROOM REALM';
      this.overlayBody.text = 'NIVEAU TUTORIEL — ARBRE-RACINE\n\nLe Royaume-Champignon dort.\nLe Chevalier Sporal entend encore le Cœur du Mycélium.';
      this.overlayPrompt.text = 'TOUCHER OU ENTRÉE POUR ÉCOUTER L’ÉCHO';
    } else if (this.screen === 'intro') {
      this.overlayTitle.text = 'LE RÉVEIL';
      this.overlayBody.text = 'Sous l’Arbre-Originel, les armes des anciens attendent.\nTraverse les ruines, choisis une seule arme,\npuis brise l’emprise du Gardien des Racines.';
      this.overlayPrompt.text = 'COURIR · SAUTER · FRAPPER · ESQUIVER';
    } else if (this.screen === 'weapon_choice') {
      this.overlayTitle.text = 'ÉVEIL DES ARMES';
      this.overlayBody.text = this.weaponChoice === 0
        ? '❯ ÉPÉE LONGUE\nRapide · portée supérieure · combo fluide\n\n  MARTEAU SPORÉAL\nLent · impact massif · brise-garde'
        : '  ÉPÉE LONGUE\nRapide · portée supérieure · combo fluide\n\n❯ MARTEAU SPORÉAL\nLent · impact massif · brise-garde';
      this.overlayPrompt.text = 'GAUCHE/DROITE PUIS ENTRÉE — CHOIX DÉFINITIF';
    } else if (this.screen === 'defeat') {
      this.overlayTitle.text = 'L’ÉCHO S’ÉTEINT';
      this.overlayBody.text = 'Le Réseau te ramène au dernier point de restauration.';
      this.overlayPrompt.text = 'TOUCHER OU ENTRÉE POUR REPRENDRE';
    } else {
      this.overlayTitle.text = 'LE ROYAUME S’ÉVEILLE';
      this.overlayBody.text = `Le Gardien est tombé. Les spores dansent de nouveau.\n\nSCORE ${this.world?.player.score ?? 0}`;
      this.overlayPrompt.text = 'TOUCHER OU ENTRÉE POUR REJOUER';
    }
  }

  private renderFrame(dtMs: number): void {
    if (!this.world) return;
    this.visualTime += Math.max(0, Math.min(dtMs / 1_000, 0.05));
    const target = this.cameraTarget();
    const smoothing = Math.min(1, (dtMs / 1_000) * 8);
    this.cameraX += (target - this.cameraX) * smoothing;
    this.worldRoot.x = -Math.round(this.cameraX);
    this.syncHero();
    this.syncEnemies();
    this.drawDynamicFx();
    this.drawHud();
    const touchCapable = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
    this.touchLayer.visible = (this.screen === 'playing' || this.screen === 'boss') && (this.options?.showTouchControls ?? touchCapable);
    if (this.messageMs > 0) {
      this.messageMs = Math.max(0, this.messageMs - dtMs);
      this.message.alpha = Math.min(1, this.messageMs / 250);
    } else {
      this.message.text = '';
    }
  }

  private cameraTarget(): number {
    if (!this.world) return 0;
    const player = this.world.player;
    const screenAnchor = player.facing > 0 ? 0.42 : 0.58;
    return Math.max(0, Math.min(this.world.width - this.viewW, player.x + player.w / 2 - this.viewW * screenAnchor));
  }

  private syncHero(): void {
    if (!this.hero || !this.world) return;
    const player = this.world.player;
    this.hero.x = player.x + player.w / 2;
    this.hero.y = player.y + player.h;
    this.hero.alpha = player.invulnerableMs > 0 && Math.floor(player.invulnerableMs / 70) % 2 === 0 ? 0.42 : 1;
    const attackScale = player.attackMs > 0 ? 1.07 : 1;
    if (this.hero instanceof Sprite) {
      this.hero.anchor.set(0.5, 1);
      const moving = Math.abs(player.vx) > 24;
      const breathe = player.grounded ? 1 + Math.sin(this.visualTime * (moving ? 9 : 2.7)) * (moving ? 0.018 : 0.012) : 1;
      const dodgeStretch = player.dodgeMs > 0 ? 1.12 : 1;
      this.hero.height = 154 * attackScale * breathe;
      const aspect = this.hero.texture.width / Math.max(1, this.hero.texture.height);
      this.hero.width = this.hero.height * aspect * dodgeStretch;
      this.hero.y += player.grounded ? Math.sin(this.visualTime * (moving ? 9 : 2.7)) * (moving ? 2.2 : 1.6) : 0;
      this.hero.rotation = player.attackMs > 0 ? -0.07 * player.facing : player.dodgeMs > 0 ? 0.11 * player.facing : Math.sin(this.visualTime * 2.1) * 0.009;
      this.hero.scale.x = Math.abs(this.hero.scale.x) * player.facing;
    } else {
      this.hero.scale.set(player.facing * attackScale, attackScale);
    }
  }

  private syncEnemies(): void {
    if (!this.world) return;
    for (const enemy of this.world.enemies) {
      const view = this.enemyViews.get(enemy.id);
      if (!view) continue;
      view.visible = enemy.alive;
      if (!enemy.alive) continue;
      view.x = enemy.x + enemy.w / 2;
      view.y = enemy.y + enemy.h;
      view.alpha = enemy.invulnerableMs > 0 ? 0.55 : 1;
      if (view instanceof Sprite) {
        if (enemy.kind === 'root_guardian_boss') {
          const phaseTexture = this.bossPhaseTextures.get(enemy.phase);
          if (phaseTexture) view.texture = phaseTexture;
          view.height = 320 + Math.sin(this.visualTime * 1.4) * 5;
        } else view.height = enemy.kind === 'chevalier_fongique' || enemy.kind === 'moussu_furieux' ? 142 : enemy.kind === 'porteur_sporeal' ? 118 : 104;
        const aspect = view.texture.width / Math.max(1, view.texture.height);
        view.width = view.height * aspect;
        view.anchor.set(0.5, 1);
        view.y += Math.sin(this.visualTime * (enemy.kind === 'porteur_sporeal' ? 3.6 : 2.2) + enemy.originX * 0.01) * (enemy.kind === 'porteur_sporeal' ? 7 : 2);
        view.rotation = enemy.state === 'charge' ? 0.07 * enemy.facing : Math.sin(this.visualTime * 1.7 + enemy.originX * 0.02) * 0.012;
        view.scale.x = Math.abs(view.scale.x) * enemy.facing;
      } else {
        view.scale.x = Math.abs(view.scale.x) * enemy.facing;
      }
    }
  }

  private drawDynamicFx(): void {
    if (!this.world) return;
    const graphics = this.dynamicFx;
    graphics.clear();
    const player = this.world.player;
    for (let index = 0; index < 54; index++) {
      const x = (index * 397 + Math.sin(this.visualTime * 0.31 + index) * 34 + this.world.width * 3) % this.world.width;
      const y = 105 + ((index * 83 - this.visualTime * (9 + index % 5) + 1_800) % 430);
      const radius = index % 9 === 0 ? 3.2 : index % 3 === 0 ? 1.8 : 1.1;
      const color = index % 7 === 0 ? COLORS.magenta : index % 5 === 0 ? COLORS.cyan : COLORS.goldLight;
      graphics.circle(x, y, radius).fill({ color, alpha: 0.11 + (index % 4) * 0.035 });
    }
    this.drawInteractiveWorld(graphics);
    if (player.attackMs > 0) {
      const radius = player.weapon === 'spore_hammer' ? 88 : player.weapon === 'longsword' ? 98 : 72;
      const start = player.facing > 0 ? -0.9 : Math.PI - 0.9;
      const end = player.facing > 0 ? 0.9 : Math.PI + 0.9;
      graphics.arc(player.x + player.w / 2, player.y + player.h * 0.48, radius, start, end);
      graphics.stroke({ color: player.weapon === 'spore_hammer' ? COLORS.magenta : COLORS.cyan, width: 7, alpha: 0.72 });
      graphics.arc(player.x + player.w / 2, player.y + player.h * 0.48, radius + 13, start, end);
      graphics.stroke({ color: COLORS.goldLight, width: 2, alpha: 0.56 });
    }
    if (player.dodgeMs > 0) {
      const direction = player.facing;
      for (let trail = 1; trail <= 4; trail++) {
        graphics.moveTo(player.x + player.w / 2 - direction * trail * 22, player.y + 10);
        graphics.lineTo(player.x + player.w / 2 - direction * trail * 34, player.y + player.h);
        graphics.stroke({ color: trail % 2 ? COLORS.cyan : COLORS.magenta, width: 8 - trail, alpha: 0.24 / trail });
      }
    }
    for (const projectile of this.world.projectiles) this.drawProjectile(graphics, projectile);
    const boss = echoesBoss(this.world);
    if (boss?.alive && boss.state === 'windup') {
      graphics.circle(boss.x + boss.w / 2, boss.y + boss.h * 0.55, 42 + (boss.stateMs % 180) * 0.12)
        .stroke({ color: boss.phase === 3 ? COLORS.danger : COLORS.magenta, width: 5, alpha: 0.75 });
    }
    for (const enemy of this.world.enemies) {
      if (!enemy.alive || enemy.kind === 'sporeling' || enemy.kind === 'rampore') continue;
      const width = enemy.kind === 'root_guardian_boss' ? 0 : 52;
      if (width > 0) {
        graphics.roundRect(enemy.x, enemy.y - 10, width, 5, 2).fill({ color: COLORS.ink, alpha: 0.8 });
        graphics.roundRect(enemy.x, enemy.y - 10, width * (enemy.hp / enemy.maxHp), 5, 2).fill(COLORS.magenta);
      }
    }
  }

  private drawInteractiveWorld(graphics: Graphics): void {
    if (!this.world) return;
    const weaponAltars = this.world.collectibles
      .filter((collectible) => collectible.type === 'weapon_echo')
      .sort((a, b) => a.x - b.x);
    for (const collectible of this.world.collectibles) {
      if (collectible.type === 'weapon_echo') {
        const selectedIndex = this.world.selectedWeapon === 'spore_hammer' ? 1 : 0;
        const selected = !!this.world.selectedWeapon && weaponAltars[selectedIndex] === collectible;
        if (collectible.collected && !selected) continue;
        graphics.circle(collectible.x, collectible.y + 22, selected ? 37 : 31)
          .stroke({ color: selected ? COLORS.cyan : COLORS.gold, width: selected ? 5 : 3, alpha: 0.82 });
        graphics.moveTo(collectible.x, collectible.y - 12).lineTo(collectible.x + 7, collectible.y + 15).lineTo(collectible.x - 7, collectible.y + 15).closePath();
        graphics.fill({ color: selected ? COLORS.goldLight : COLORS.cyan, alpha: 0.9 });
      } else if (!collectible.collected) {
        graphics.circle(collectible.x, collectible.y, 8)
          .fill(collectible.type === 'memory_shard' ? COLORS.magenta : COLORS.cyan);
      }
    }
    const gateColor = this.world.bossDefeated ? COLORS.moss : COLORS.danger;
    graphics.roundRect(this.world.goal.x, this.world.goal.y, this.world.goal.w, this.world.goal.h, 20)
      .stroke({ color: gateColor, width: 4, alpha: 0.92 });
    if (!this.world.bossDefeated) {
      graphics.circle(this.world.goal.x + this.world.goal.w / 2, this.world.goal.y + this.world.goal.h / 2, 10)
        .stroke({ color: COLORS.danger, width: 3 });
    }
  }

  private drawProjectile(graphics: Graphics, projectile: EchoesProjectile): void {
    if (projectile.kind === 'root_wave') {
      graphics.roundRect(projectile.x, projectile.y, projectile.w, projectile.h, 10).fill({ color: COLORS.violet, alpha: 0.76 });
      graphics.stroke({ color: COLORS.magenta, width: 3 });
    } else {
      graphics.circle(projectile.x + projectile.w / 2, projectile.y + projectile.h / 2, projectile.w / 2)
        .fill({ color: projectile.kind === 'toxic_cloud' ? COLORS.violetDark : COLORS.magenta, alpha: 0.78 });
      graphics.stroke({ color: COLORS.cyan, width: 2, alpha: 0.65 });
    }
  }

  private drawHud(): void {
    if (!this.world) return;
    const player = this.world.player;
    this.hud.clear();
    this.hud.roundRect(12, 12, 315, 92, 8).fill({ color: COLORS.ink, alpha: 0.74 }).stroke({ color: COLORS.gold, width: 1, alpha: 0.65 });
    for (let index = 0; index < player.maxHp; index++) {
      const x = 26 + index * 29;
      this.hud.circle(x + 7, 84, 8).fill(index < player.hp ? COLORS.magenta : 0x312738);
    }
    this.hudTitle.text = 'LE CHEVALIER SPORAL';
    const weapon = player.weapon === 'spore_hammer' ? 'Marteau sporéal' : player.weapon === 'longsword' ? 'Épée longue' : 'Lame d’Écho';
    this.hudStats.text = `${weapon}   ·   Échos ${player.spores + player.memoryShards}\nScore ${player.score}`;
    const zone = this.world.zones.find((candidate) => candidate.id === this.world?.activeZoneId);
    this.objective.text = zone?.label?.toUpperCase() ?? '';

    const boss = echoesBoss(this.world);
    const showBoss = !!boss?.alive && this.world.bossEngaged;
    this.bossHud.visible = showBoss;
    this.bossLabel.visible = showBoss;
    this.bossHud.clear();
    if (showBoss && boss) {
      const width = Math.min(560, this.viewW * 0.48);
      const x = (this.viewW - width) / 2;
      this.bossHud.roundRect(x, 91, width, 13, 6).fill({ color: COLORS.ink, alpha: 0.88 });
      this.bossHud.roundRect(x + 2, 93, (width - 4) * (boss.hp / boss.maxHp), 9, 4).fill(boss.phase === 3 ? COLORS.danger : COLORS.violet);
      this.bossHud.stroke({ color: COLORS.gold, width: 1 });
      this.bossLabel.text = `GARDIEN DES RACINES · PHASE ${boss.phase}`;
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    const handled = ['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'q', 'd', 'w', 'z', ' ', 'x', 'j', 'k', 'shift', 'e', 'enter'].includes(key);
    if (!handled) return;
    event.preventDefault();
    const first = !this.keys.has(key);
    this.keys.add(key);
    if (!first) return;
    if (this.screen === 'menu' || this.screen === 'intro' || this.screen === 'defeat' || this.screen === 'victory') {
      if (key === 'enter' || key === ' ' || key === 'e') this.confirmOverlay();
      return;
    }
    if (this.screen === 'weapon_choice') {
      if (key === 'arrowleft' || key === 'a' || key === 'q') this.weaponChoice = 0;
      else if (key === 'arrowright' || key === 'd') this.weaponChoice = 1;
      else if (key === 'enter' || key === ' ' || key === 'e') this.confirmWeapon();
      this.refreshOverlay();
      return;
    }
    if (key === ' ' || key === 'arrowup' || key === 'w' || key === 'z') this.edge.jump = true;
    else if (key === 'x' || key === 'j') this.edge.attack = true;
    else if (key === 'k' || key === 'shift') this.edge.dodge = true;
    else if (key === 'e' || key === 'arrowdown') this.edge.interact = true;
  }

  private onKeyUp(event: KeyboardEvent): void {
    this.keys.delete(event.key.toLowerCase());
  }

  private pointerPoint(event: PointerEvent): { x: number; y: number } | null {
    if (!this.app) return null;
    const rect = this.app.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: ((event.clientX - rect.left) / rect.width) * this.viewW,
      y: ((event.clientY - rect.top) / rect.height) * this.viewH,
    };
  }

  private controlAt(x: number, y: number): TouchControl | null {
    const candidates: Array<{ id: TouchControl; x: number; y: number; radius: number }> = [
      { id: 'left', x: 84, y: this.viewH - 88, radius: 58 },
      { id: 'right', x: 194, y: this.viewH - 88, radius: 58 },
      { id: 'interact', x: this.viewW - 478, y: this.viewH - 76, radius: 52 },
      { id: 'dodge', x: this.viewW - 354, y: this.viewH - 90, radius: 58 },
      { id: 'jump', x: this.viewW - 224, y: this.viewH - 112, radius: 62 },
      { id: 'attack', x: this.viewW - 92, y: this.viewH - 82, radius: 68 },
    ];
    return candidates.find((candidate) => Math.hypot(x - candidate.x, y - candidate.y) <= candidate.radius)?.id ?? null;
  }

  private onPointerDown(event: PointerEvent): void {
    const point = this.pointerPoint(event);
    if (!point) return;
    event.preventDefault();
    if (this.screen === 'menu' || this.screen === 'intro' || this.screen === 'defeat' || this.screen === 'victory') {
      this.confirmOverlay();
      return;
    }
    if (this.screen === 'weapon_choice') {
      this.weaponChoice = point.x < this.viewW / 2 ? 0 : 1;
      this.confirmWeapon();
      return;
    }
    const control = this.controlAt(point.x, point.y);
    if (!control) return;
    this.touchPointers.set(event.pointerId, control);
    this.touchHeld.add(control);
    if (control === 'jump') this.edge.jump = true;
    else if (control === 'attack') this.edge.attack = true;
    else if (control === 'dodge') this.edge.dodge = true;
    else if (control === 'interact') this.edge.interact = true;
    this.app?.canvas.setPointerCapture?.(event.pointerId);
  }

  private onPointerUp(event: PointerEvent): void {
    const control = this.touchPointers.get(event.pointerId);
    if (!control) return;
    event.preventDefault();
    this.touchPointers.delete(event.pointerId);
    if (![...this.touchPointers.values()].includes(control)) this.touchHeld.delete(control);
  }

  private confirmOverlay(): void {
    if (!this.world) return;
    void this.audio.bgm?.play().catch(() => undefined);
    if (this.screen === 'menu') this.setScreen('intro');
    else if (this.screen === 'intro') this.setScreen('playing');
    else if (this.screen === 'defeat') {
      retryEchoesWorld(this.world);
      this.cameraX = this.cameraTarget();
      this.setScreen('playing');
    } else if (this.screen === 'victory') {
      restartEchoesWorld(this.world);
      this.cameraX = this.cameraTarget();
      this.buildWorldViews();
      this.weaponChoiceSeen = false;
      this.setScreen('menu');
    }
  }

  private confirmWeapon(): void {
    if (!this.world) return;
    chooseEchoesWeapon(this.world, this.weaponChoice === 0 ? 'longsword' : 'spore_hammer');
    for (const event of drainEchoesEvents(this.world)) this.handleEvent(event);
    this.setScreen('playing');
  }

  private pollGamepad(): void {
    const gamepad = navigator.getGamepads?.()[0];
    if (!gamepad) return;
    const axis = gamepad.axes[0] ?? 0;
    if (axis < -0.3) this.keys.add('gamepad-left'); else this.keys.delete('gamepad-left');
    if (axis > 0.3) this.keys.add('gamepad-right'); else this.keys.delete('gamepad-right');
    const pressed = gamepad.buttons.map((button) => button.pressed);
    const edge = (index: number): boolean => !!pressed[index] && !this.previousGamepadButtons[index];
    if (this.screen === 'weapon_choice') {
      if (edge(14)) this.weaponChoice = 0;
      if (edge(15)) this.weaponChoice = 1;
      if (edge(0) || edge(9)) this.confirmWeapon();
      this.refreshOverlay();
      this.previousGamepadButtons = pressed;
      return;
    }
    if (!['playing', 'boss'].includes(this.screen)) {
      if (edge(0) || edge(9)) this.confirmOverlay();
      this.previousGamepadButtons = pressed;
      return;
    }
    if (edge(0)) this.edge.jump = true;
    if (edge(2)) this.edge.attack = true;
    if (edge(1)) this.edge.dodge = true;
    if (edge(3)) this.edge.interact = true;
    this.previousGamepadButtons = pressed;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.keyDownHandler);
    window.removeEventListener('keyup', this.keyUpHandler);
    if (this.app) {
      this.app.canvas.removeEventListener('pointerdown', this.pointerDownHandler);
      this.app.canvas.removeEventListener('pointerup', this.pointerUpHandler);
      this.app.canvas.removeEventListener('pointercancel', this.pointerUpHandler);
      this.app.canvas.removeEventListener('pointerleave', this.pointerUpHandler);
      this.app.ticker.remove(this.tick);
      this.app.destroy(true, { children: true });
    }
    this.app = null;
    this.world = null;
    this.gdl = null;
    this.enemyViews.clear();
    this.enemyTextures.clear();
    this.bossPhaseTextures.clear();
    this.keys.clear();
    this.touchHeld.clear();
    this.touchPointers.clear();
    disposeGdlAudio(this.audio);
  }
}
