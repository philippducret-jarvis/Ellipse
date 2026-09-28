import { Application, Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import type { GameDefinition } from '@ellipse/shared';
import {
  activateMergeDropAbility,
  awakenMergeDropHero,
  createMergeDropWorldFromGdl,
  drainMergeDropEvents,
  dropMergeBall,
  equipMergeDropCompanion,
  equipMergeDropRelic,
  mergeDropAwakenCost,
  mergeDropHeroLevel,
  mergeDropHeroStars,
  primeMergeDropRun,
  selectMergeDropHero,
  setMergeDropAim,
  stepMergeDropWorld,
  summonMergeDropHero,
  summonMergeDropHeroTen,
  summonMergeDropRelic,
  summonMergeDropRelicTen,
  type MergeDropBall,
  type MergeDropEvent,
  type MergeDropHero,
  type MergeDropRelicOutcome,
  type MergeDropRunRules,
  type MergeDropSummonOptions,
  type MergeDropSummonOutcome,
  type MergeDropWorld,
} from '../sim/merge-drop.js';
import {
  applyMergeDropProgress,
  mergeDropProgressFromWorld,
} from './merge-drop-progress.js';

export interface MergeDropEngineOptions {
  container: HTMLElement;
  width?: number;
  height?: number;
}

interface AstreVisual extends Container {
  portraitSprite?: Sprite;
  portraitBaseScale?: number;
}

interface BallView {
  root: AstreVisual;
  ball: MergeDropBall;
}

interface Spark {
  gfx: Graphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

interface UltBanner {
  root: Container;
  life: number;
  maxLife: number;
}

interface ShockWave {
  gfx: Graphics;
  x: number;
  y: number;
  r0: number;
  color: number;
  life: number;
  maxLife: number;
}

interface Floater {
  node: Text;
  life: number;
  maxLife: number;
}

const WIDTH = 720;
const HEIGHT = 1280;
const LOADOUT_Y = 1024;
const LOADOUT_H = 108;
const HERO_PANEL = { x: 42, width: 300 };
const RELIC_PANEL = { x: 358, width: 154 };
const COMPANION_PANEL = { x: 524, width: 154 };
const ACTION_Y = 1144;
const ACTION_H = 88;
const ULT_BUTTON = { x: 42, width: 310 };
const SANCTUARY_BUTTON = { x: 368, width: 310 };
const RESULT_BUTTON = { x: 120, y: 772, width: 480, height: 96 };
/** Événements émis vers l'écran hub (hors canvas). */
export const OPEN_SUMMON_EVENT = 'merge-drop:open-summon';
export const OPEN_RELIQUARY_EVENT = 'merge-drop:open-reliquary';
export const OPEN_GALLERY_EVENT = 'merge-drop:open-gallery';
export const RUN_RESULT_EVENT = 'merge-drop:run-result';
export const ABILITY_CAST_EVENT = 'merge-drop:ability-cast';

function colorNumber(value: string, fallback = 0xffffff): number {
  const parsed = Number.parseInt(value.replace('#', ''), 16);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mixColor(value: string, target: number, amount: number): number {
  const base = colorNumber(value);
  const r = (base >> 16) & 0xff;
  const g = (base >> 8) & 0xff;
  const b = base & 0xff;
  const tr = (target >> 16) & 0xff;
  const tg = (target >> 8) & 0xff;
  const tb = target & 0xff;
  return (
    (Math.round(r + (tr - r) * amount) << 16)
    | (Math.round(g + (tg - g) * amount) << 8)
    | Math.round(b + (tb - b) * amount)
  );
}

function textNode(text: string, size: number, color: number, weight: 'normal' | 'bold' = 'normal'): Text {
  return new Text({
    text,
    style: {
      fill: color,
      fontSize: size,
      fontFamily: 'Inter, Segoe UI, system-ui, sans-serif',
      fontWeight: weight,
      letterSpacing: 0,
    },
  });
}

function fitSprite(sprite: Sprite, width: number, height: number): void {
  const scale = Math.max(width / Math.max(1, sprite.texture.width), height / Math.max(1, sprite.texture.height));
  sprite.scale.set(scale);
  sprite.x = (width - sprite.texture.width * scale) / 2;
  sprite.y = (height - sprite.texture.height * scale) / 2;
}

export class MergeDropEngine {
  private app: Application | null = null;
  private gdl: GameDefinition | null = null;
  private world: MergeDropWorld | null = null;
  private root = new Container();
  private ballLayer = new Container();
  private fxLayer = new Container();
  private uiLayer = new Container();
  private overlayLayer = new Container();
  private ballViews = new Map<number, BallView>();
  private heroTextures = new Map<string, Texture>();
  private sparks: Spark[] = [];
  private banners: UltBanner[] = [];
  private waves: ShockWave[] = [];
  private floaters: Floater[] = [];
  private shakeMs = 0;
  private shakeStrength = 0;
  private aimPreview: Container | null = null;
  private aimPreviewTier = -1;
  private nextPreview: Container | null = null;
  private nextPreviewTier = -1;
  private aimGuide = new Graphics();
  private dangerLine = new Graphics();
  private flash = new Graphics();
  private scoreText = textNode('', 28, 0xf8fafc, 'bold');
  private currencyText = textNode('', 22, 0xfacc15, 'bold');
  private nextText = textNode('', 20, 0xe2e8f0);
  private comboText = textNode('', 24, 0xfb7185, 'bold');
  private statusText = textNode('', 22, 0xf8fafc, 'bold');
  private objectiveText = textNode('', 21, 0xdbeafe);
  private missionText = textNode('', 16, 0x67e8f9, 'bold');
  private abilityText = textNode('', 20, 0xf8fafc, 'bold');
  private sanctuaryText = textNode('', 18, 0xf8fafc, 'bold');
  private heroFingerprint = '';
  private overlayFingerprint = '';
  private keys = new Set<string>();
  private flashAlpha = 0;
  private paused = false;
  private resultEventFingerprint = '';
  private persistenceKey = 'ellipse.merge-drop';

  private boundKeyDown = (event: KeyboardEvent) => this.onKey(event, true);
  private boundKeyUp = (event: KeyboardEvent) => this.onKey(event, false);
  private boundPointerMove = (event: PointerEvent) => this.onPointerMove(event);
  private boundPointerDown = (event: PointerEvent) => this.onPointerDown(event);

  async init(options: MergeDropEngineOptions): Promise<void> {
    this.app = new Application();
    await this.app.init({
      width: options.width ?? WIDTH,
      height: options.height ?? HEIGHT,
      backgroundColor: 0x07131d,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    });
    options.container.appendChild(this.app.canvas);
    this.app.canvas.style.touchAction = 'none';
    this.app.canvas.style.width = '100%';
    this.app.canvas.style.height = 'auto';
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    this.app.canvas.addEventListener('pointermove', this.boundPointerMove);
    this.app.canvas.addEventListener('pointerdown', this.boundPointerDown);
    this.app.ticker.add(this.tick);
  }

  async loadGDL(gdl: GameDefinition): Promise<void> {
    if (!this.app) return;
    this.gdl = gdl;
    this.persistenceKey = `ellipse.merge-drop.${gdl.meta.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    this.world = createMergeDropWorldFromGdl(gdl);
    this.restoreProgress();
    primeMergeDropRun(this.world);
    await this.buildScene();
  }

  getWorld(): MergeDropWorld | null {
    return this.world;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) {
      this.keys.clear();
      this.persistProgress();
    }
  }

  saveProgress(): void {
    this.persistProgress();
  }

  restartRun(): void {
    this.resetRun();
  }

  /** Démarre une mission de campagne, un défi chronométré ou un boss. */
  startMission(rules: Partial<MergeDropRunRules>): void {
    this.resetRun(rules);
    this.setPaused(false);
  }

  /** Récompenses des mini-jeux HTML, persistées dans la même économie. */
  grantRewards(currency: number, essence = 0): void {
    if (!this.world) return;
    this.world.currency += Math.max(0, Math.floor(currency));
    this.world.essence += Math.max(0, Math.floor(essence));
    this.persistProgress();
  }

  /**
   * Invocation unitaire pilotée par le Sanctuaire (hub HTML). L'animation est
   * jouée côté écran : on efface donc l'overlay canvas et on persiste aussitôt.
   */
  summonHero(options: MergeDropSummonOptions = {}): MergeDropSummonOutcome | null {
    if (!this.world) return null;
    const result = summonMergeDropHero(this.world, options);
    this.world.summon_result = undefined;
    if (!result) return null;
    this.persistProgress();
    const { hero_id, rarity, duplicate, essence_gained, stars, featured } = result;
    return { hero_id, rarity, duplicate, essence_gained, stars, featured };
  }

  /** Invocation ×10 pilotée par le Sanctuaire — au moins un SR+ garanti. */
  summonHeroTen(options: MergeDropSummonOptions = {}): MergeDropSummonOutcome[] | null {
    if (!this.world) return null;
    const batch = summonMergeDropHeroTen(this.world, options);
    this.world.summon_batch = undefined;
    if (!batch) return null;
    this.persistProgress();
    return batch.results;
  }

  /** Éveil du Gardien (essence) — exposé pour les écrans hub. */
  awakenHero(heroId: string): boolean {
    if (!this.world) return false;
    const done = awakenMergeDropHero(this.world, heroId);
    if (done) this.persistProgress();
    return done;
  }

  /** Coût du prochain éveil (null si niveau max). */
  awakenCost(heroId: string): number | null {
    if (!this.world) return null;
    return mergeDropAwakenCost(this.world, heroId);
  }

  /** Sélection du Gardien actif (Galerie du hub). */
  selectHero(heroId: string): boolean {
    if (!this.world) return false;
    const done = selectMergeDropHero(this.world, heroId);
    if (done) this.persistProgress();
    return done;
  }

  /** Invocation unitaire au Reliquaire (reliques & compagnons). */
  summonRelic(): MergeDropRelicOutcome | null {
    if (!this.world) return null;
    const result = summonMergeDropRelic(this.world);
    if (result) this.persistProgress();
    return result;
  }

  /** Invocation ×10 au Reliquaire — au moins un SR+ garanti. */
  summonRelicTen(): MergeDropRelicOutcome[] | null {
    if (!this.world) return null;
    const results = summonMergeDropRelicTen(this.world);
    if (results) this.persistProgress();
    return results;
  }

  equipRelic(relicId: string): boolean {
    if (!this.world) return false;
    const done = equipMergeDropRelic(this.world, relicId);
    if (done) this.persistProgress();
    return done;
  }

  equipCompanion(companionId: string): boolean {
    if (!this.world) return false;
    const done = equipMergeDropCompanion(this.world, companionId);
    if (done) this.persistProgress();
    return done;
  }

  private restoreProgress(): void {
    if (!this.world) return;
    try {
      const raw = window.localStorage.getItem(this.persistenceKey);
      if (!raw) return;
      applyMergeDropProgress(this.world, JSON.parse(raw));
    } catch {
      // Local progress is optional; a malformed save never blocks the game.
    }
  }

  private persistProgress(): void {
    if (!this.world) return;
    try {
      window.localStorage.setItem(this.persistenceKey, JSON.stringify(mergeDropProgressFromWorld(this.world)));
    } catch {
      // Private browsing and embedded previews may disable localStorage.
    }
  }

  private async buildScene(): Promise<void> {
    if (!this.app || !this.gdl || !this.world) return;
    this.root.destroy({ children: true });
    this.root = new Container();
    this.ballLayer = new Container();
    this.fxLayer = new Container();
    this.uiLayer = new Container();
    this.overlayLayer = new Container();
    this.ballViews.clear();
    this.heroTextures.clear();
    this.sparks = [];
    this.banners = [];
    this.waves = [];
    this.floaters = [];
    this.aimPreview = null;
    this.aimPreviewTier = -1;
    this.nextPreview = null;
    this.nextPreviewTier = -1;
    this.app.stage.removeChildren();
    this.app.stage.addChild(this.root);

    const backgroundUrl = this.gdl.scenes[0]?.background?.image;
    let backgroundLoaded = false;
    if (backgroundUrl) {
      try {
        const texture = await Assets.load<Texture>(backgroundUrl);
        const sprite = new Sprite(texture);
        fitSprite(sprite, this.app.screen.width, this.app.screen.height);
        sprite.alpha = 1;
        this.root.addChild(sprite);
        backgroundLoaded = true;
      } catch {
        // The procedural backdrop below is the guaranteed fallback.
      }
    }

    if (!backgroundLoaded) this.drawBackdrop();
    this.drawBoard();
    this.root.addChild(this.ballLayer, this.fxLayer, this.dangerLine, this.uiLayer, this.overlayLayer);
    this.drawHudShell();
    await this.loadHeroPortraits();
    this.refreshLoadout(true);
    this.renderFrame(0);
  }

  private drawBackdrop(): void {
    const backdrop = new Graphics();
    backdrop.rect(0, 0, WIDTH, HEIGHT).fill({ color: 0x07131d, alpha: 1 });
    backdrop.circle(92, 128, 190).fill({ color: 0x0f766e, alpha: 0.16 });
    backdrop.circle(660, 270, 240).fill({ color: 0xe11d48, alpha: 0.1 });
    backdrop.circle(420, 1180, 260).fill({ color: 0xf59e0b, alpha: 0.07 });
    for (let i = 0; i < 82; i++) {
      const x = (i * 137 + 29) % WIDTH;
      const y = (i * 83 + 47) % HEIGHT;
      const radius = 0.8 + (i % 3) * 0.55;
      const color = i % 7 === 0 ? 0x5eead4 : i % 5 === 0 ? 0xfacc15 : 0xe2e8f0;
      backdrop.circle(x, y, radius).fill({ color, alpha: 0.22 + (i % 4) * 0.08 });
    }
    this.root.addChild(backdrop);
  }

  private drawBoard(): void {
    if (!this.world) return;
    const board = this.world.config.board;
    const shell = new Graphics();
    shell.roundRect(board.x - 12, board.y - 12, board.width + 24, board.height + 24, 28)
      .fill({ color: 0x02131e, alpha: 0.08 })
      .stroke({ color: 0xd6a84f, alpha: 0.78, width: 4 });
    shell.roundRect(board.x, board.y, board.width, board.height, 20)
      .fill({ color: 0x031622, alpha: 0.12 })
      .stroke({ color: 0x4de7e2, alpha: 0.64, width: 2 });
    shell.roundRect(board.x + 8, board.y + 8, board.width - 16, board.height - 16, 15)
      .stroke({ color: 0xf2c46f, alpha: 0.26, width: 1 });
    for (const [x, y] of [
      [board.x, board.y],
      [board.x + board.width, board.y],
      [board.x, board.y + board.height],
      [board.x + board.width, board.y + board.height],
    ] as Array<[number, number]>) {
      shell.circle(x, y, 10).fill({ color: 0x092839, alpha: 0.92 }).stroke({ color: 0xe7b75e, alpha: 0.9, width: 3 });
      shell.circle(x, y, 4).fill({ color: 0x67e8f9, alpha: 0.92 });
    }
    for (let i = 0; i < 8; i++) {
      shell.circle(board.x + 38 + i * 72, board.y + board.height - 18, 2.3)
        .fill({ color: i % 2 === 0 ? 0xf59e0b : 0x2dd4bf, alpha: 0.46 });
    }
    this.root.addChild(shell);

    this.dangerLine = new Graphics();
    this.aimGuide = new Graphics();
    this.root.addChild(this.aimGuide);
  }

  private drawHudShell(): void {
    if (!this.world || !this.gdl) return;
    const chrome = new Graphics();
    chrome.roundRect(24, 14, 672, 154, 18)
      .fill({ color: 0x03111b, alpha: 0.58 })
      .stroke({ color: 0xd6a84f, alpha: 0.52, width: 2 });
    chrome.roundRect(24, 1016, 672, 250, 18)
      .fill({ color: 0x03111b, alpha: 0.7 })
      .stroke({ color: 0x4de7e2, alpha: 0.4, width: 2 });
    this.uiLayer.addChild(chrome);

    const eyebrow = textNode("OBSERVATOIRE D'ASTRA", 16, 0x67e8f9, 'bold');
    eyebrow.x = 42;
    eyebrow.y = 26;
    const title = textNode(this.gdl.meta.title.toUpperCase(), 38, 0xfff7df, 'bold');
    title.x = 42;
    title.y = 48;
    this.objectiveText.x = 44;
    this.objectiveText.y = 94;
    this.missionText.anchor.set(1, 0);
    this.missionText.x = 596;
    this.missionText.y = 98;
    this.scoreText.x = 44;
    this.scoreText.y = 128;
    // Ancré à x=596 pour ne pas passer sous le bouton ⌂ (HTML) qui recouvre le coin haut-droit.
    this.currencyText.anchor.set(1, 0);
    this.currencyText.x = 596;
    this.currencyText.y = 32;
    this.nextText.anchor.set(1, 0);
    this.nextText.x = 596;
    this.nextText.y = 68;
    this.comboText.anchor.set(1, 0);
    this.comboText.x = 596;
    this.comboText.y = 120;
    this.statusText.anchor.set(0.5, 0.5);
    this.statusText.x = WIDTH / 2;
    this.statusText.y = 995;
    this.uiLayer.addChild(
      eyebrow,
      title,
      this.objectiveText,
      this.missionText,
      this.scoreText,
      this.currencyText,
      this.nextText,
      this.comboText,
      this.statusText,
    );

    this.drawActionButton(ULT_BUTTON.x, ACTION_Y, ULT_BUTTON.width, ACTION_H, 0x0f766e, this.abilityText);
    this.drawActionButton(SANCTUARY_BUTTON.x, ACTION_Y, SANCTUARY_BUTTON.width, ACTION_H, 0x6d28d9, this.sanctuaryText);
    const rates = textNode('Invocations au Sanctuaire — taux R 70% · SR 25% · SSR 5% · ×10 SR+ garanti', 17, 0xfacc15, 'bold');
    rates.anchor.set(0.5, 0);
    rates.x = WIDTH / 2;
    rates.y = 1236;
    const help = textNode('ESPACE ult · G sanctuaire · toucher le loadout = Galerie / Reliquaire · R recommencer', 14, 0xcbd5e1);
    help.anchor.set(0.5, 0);
    help.x = WIDTH / 2;
    help.y = 1258;
    this.uiLayer.addChild(rates, help);

    this.flash = new Graphics();
    this.flash.rect(0, 0, WIDTH, HEIGHT).fill({ color: 0xffffff, alpha: 1 });
    this.flash.alpha = 0;
    this.fxLayer.addChild(this.flash);
  }

  private drawActionButton(x: number, y: number, width: number, height: number, color: number, label: Text): void {
    const button = new Graphics();
    button.roundRect(x, y, width, height, 14)
      .fill({ color, alpha: 0.82 })
      .stroke({ color: 0xe7b75e, alpha: 0.74, width: 3 });
    button.roundRect(x + 6, y + 6, width - 12, height - 12, 10)
      .stroke({ color: mixColor(`#${color.toString(16).padStart(6, '0')}`, 0xffffff, 0.68), alpha: 0.46, width: 1 });
    label.anchor.set(0.5, 0.5);
    label.style.align = 'center';
    label.x = x + width / 2;
    label.y = y + height / 2;
    this.uiLayer.addChild(button, label);
  }

  private async loadHeroPortraits(): Promise<void> {
    if (!this.world) return;
    const sheets = new Map<string, Texture>();
    for (const hero of this.world.config.heroes) {
      if (!hero.portrait) continue;
      try {
        let sheet = sheets.get(hero.portrait);
        if (!sheet) {
          sheet = await Assets.load<Texture>(hero.portrait);
          sheets.set(hero.portrait, sheet);
        }
        const columns = Math.max(1, Math.floor(hero.portrait_columns ?? 4));
        const rows = Math.max(1, Math.floor(hero.portrait_rows ?? 1));
        const frameIndex = Math.min(columns * rows - 1, Math.max(0, Math.floor(hero.portrait_frame ?? 0)));
        const column = frameIndex % columns;
        const row = Math.floor(frameIndex / columns);
        const x = Math.floor((column * sheet.width) / columns);
        const y = Math.floor((row * sheet.height) / rows);
        const frameEndX = Math.floor(((column + 1) * sheet.width) / columns);
        const frameEndY = Math.floor(((row + 1) * sheet.height) / rows);
        const frameWidth = Math.max(1, frameEndX - x);
        const frameHeight = Math.max(1, frameEndY - y);
        this.heroTextures.set(hero.id, new Texture({
          source: sheet.source,
          frame: new Rectangle(x, y, frameWidth, frameHeight),
        }));
      } catch {
        // The initial badge remains a readable fallback when an atlas is unavailable.
      }
    }
  }

  private drawChibiFace(gfx: Graphics, cx: number, cy: number, radius: number, color: string): void {
    gfx.circle(cx, cy - radius * 0.14, radius * 0.94).fill({ color: mixColor(color, 0x020617, 0.42), alpha: 0.96 });
    gfx.circle(cx, cy + radius * 0.08, radius * 0.66).fill({ color: mixColor(color, 0xffffff, 0.72), alpha: 0.98 });
    const eyeY = cy + radius * 0.04;
    for (const side of [-1, 1]) {
      gfx.circle(cx + side * radius * 0.26, eyeY, Math.max(1.6, radius * 0.1)).fill({ color: 0x1e293b, alpha: 0.95 });
      gfx.circle(cx + side * radius * 0.23, eyeY - radius * 0.03, Math.max(0.7, radius * 0.035)).fill({ color: 0xffffff, alpha: 0.9 });
      gfx.circle(cx + side * radius * 0.4, cy + radius * 0.22, Math.max(1.2, radius * 0.08)).fill({ color: 0xfb7185, alpha: 0.32 });
    }
    gfx.arc(cx, cy + radius * 0.16, radius * 0.14, Math.PI * 0.18, Math.PI * 0.82)
      .stroke({ color: 0x1e293b, alpha: 0.85, width: Math.max(1, radius * 0.05) });
  }

  private buildHeroPanel(hero: MergeDropHero): Container {
    if (!this.world) throw new Error('MergeDrop world is not loaded');
    const root = new Container();
    root.x = HERO_PANEL.x;
    root.y = LOADOUT_Y;
    const accent = colorNumber(hero.color, 0x94a3b8);
    const card = new Graphics();
    card.roundRect(0, 0, HERO_PANEL.width, LOADOUT_H, 12)
      .fill({ color: 0x071b28, alpha: 0.88 })
      .stroke({ color: accent, alpha: 0.9, width: 3 });
    root.addChild(card);

    const portraitTexture = this.heroTextures.get(hero.id);
    if (portraitTexture) {
      card.circle(38, 54, 30).fill({ color: accent, alpha: 0.85 });
      const portrait = new Sprite(portraitTexture);
      portrait.anchor.set(0.5, 0.5);
      portrait.x = 38;
      portrait.y = 54;
      portrait.scale.set(Math.max(60 / portraitTexture.width, 60 / portraitTexture.height));
      const mask = new Graphics();
      mask.circle(38, 54, 30).fill(0xffffff);
      portrait.mask = mask;
      root.addChild(portrait, mask);
    } else {
      this.drawChibiFace(card, 38, 54, 30, hero.color);
    }

    const stars = mergeDropHeroStars(this.world, hero.id);
    const level = mergeDropHeroLevel(this.world, hero.id);
    const rarityColor = hero.rarity === 'SSR' ? 0xfacc15 : hero.rarity === 'SR' ? 0xc084fc : 0x5eead4;
    const name = textNode(`${hero.name}${level > 0 ? ` Nv${level}` : ''}`, 17, 0xfff7df, 'bold');
    name.x = 78;
    name.y = 12;
    const starText = textNode(`${'★'.repeat(stars)}${'☆'.repeat(Math.max(0, this.world.config.evolution_max_stars - stars))}`, 13, 0xfacc15, 'bold');
    starText.x = 78;
    starText.y = 36;
    const ult = textNode(`${hero.rarity} · ${hero.ability_label}`, 12, rarityColor, 'bold');
    ult.x = 78;
    ult.y = 56;
    const unlockedSkills = hero.skills.filter((entry) => stars >= entry.stars).map((entry) => entry.name);
    const skillsLine = textNode(
      unlockedSkills.length ? unlockedSkills.join(' · ') : 'Compétences : à éveiller (★)',
      10,
      unlockedSkills.length ? 0x67e8f9 : 0x64748b,
      'bold',
    );
    skillsLine.x = 78;
    skillsLine.y = 78;
    const hint = textNode('Galerie ▸', 10, 0x94a3b8, 'bold');
    hint.anchor.set(1, 0);
    hint.x = HERO_PANEL.width - 8;
    hint.y = 8;
    root.addChild(name, starText, ult, skillsLine, hint);
    return root;
  }

  private buildItemPanel(
    kind: 'relic' | 'companion',
    x: number,
  ): Container {
    if (!this.world) throw new Error('MergeDrop world is not loaded');
    const root = new Container();
    root.x = x;
    root.y = LOADOUT_Y;
    const world = this.world;
    const equippedId = kind === 'relic' ? world.equipped_relic : world.equipped_companion;
    const item = kind === 'relic'
      ? world.config.relics.find((entry) => entry.id === equippedId)
      : world.config.companions.find((entry) => entry.id === equippedId);
    const level = equippedId ? (kind === 'relic' ? world.relic_levels[equippedId] : world.companion_levels[equippedId]) ?? 0 : 0;
    const accent = colorNumber(item?.color ?? '#334155', 0x334155);
    const card = new Graphics();
    card.roundRect(0, 0, RELIC_PANEL.width, LOADOUT_H, 12)
      .fill({ color: item ? 0x071b28 : 0x030712, alpha: 0.88 })
      .stroke({ color: item ? accent : 0x334155, alpha: item ? 0.9 : 0.6, width: 2 });
    if (kind === 'relic') {
      // Icône relique : losange facetté.
      card.poly([77, 16, 95, 38, 77, 60, 59, 38]).fill({ color: accent, alpha: item ? 0.9 : 0.2 })
        .stroke({ color: 0xe7b75e, alpha: item ? 0.85 : 0.3, width: 2 });
      card.poly([77, 24, 88, 38, 77, 52, 66, 38]).stroke({ color: 0xffffff, alpha: item ? 0.4 : 0.1, width: 1 });
    } else {
      // Icône compagnon : petit esprit rond avec oreilles.
      card.circle(77, 38, 20).fill({ color: accent, alpha: item ? 0.9 : 0.2 })
        .stroke({ color: 0xe7b75e, alpha: item ? 0.85 : 0.3, width: 2 });
      card.circle(66, 22, 6).fill({ color: accent, alpha: item ? 0.85 : 0.15 });
      card.circle(88, 22, 6).fill({ color: accent, alpha: item ? 0.85 : 0.15 });
      if (item) {
        card.circle(71, 36, 2.6).fill({ color: 0x1e293b, alpha: 0.95 });
        card.circle(83, 36, 2.6).fill({ color: 0x1e293b, alpha: 0.95 });
      }
    }
    root.addChild(card);
    const title = textNode(kind === 'relic' ? 'RELIQUE' : 'COMPAGNON', 9, 0x94a3b8, 'bold');
    title.x = 8;
    title.y = 6;
    const name = textNode(item ? `${item.name} Nv${level}` : '— Reliquaire ▸', 11, item ? 0xf8fafc : 0x64748b, 'bold');
    name.anchor.set(0.5, 0);
    name.x = RELIC_PANEL.width / 2;
    name.y = 68;
    name.style.align = 'center';
    root.addChild(title, name);
    return root;
  }

  private refreshLoadout(force = false): void {
    if (!this.world) return;
    const world = this.world;
    const hero = world.config.heroes.find((entry) => entry.id === world.selected_hero_id);
    const fingerprint = [
      world.selected_hero_id,
      hero ? mergeDropHeroLevel(world, hero.id) : 0,
      hero ? mergeDropHeroStars(world, hero.id) : 0,
      world.equipped_relic ?? '',
      world.equipped_relic ? world.relic_levels[world.equipped_relic] ?? 0 : 0,
      world.equipped_companion ?? '',
      world.equipped_companion ? world.companion_levels[world.equipped_companion] ?? 0 : 0,
    ].join('|');
    if (!force && fingerprint === this.heroFingerprint) return;
    this.heroFingerprint = fingerprint;
    const old = this.uiLayer.children.filter((child) => child.label?.startsWith('loadout-'));
    for (const child of old) child.destroy({ children: true });
    if (hero) {
      const heroPanel = this.buildHeroPanel(hero);
      heroPanel.label = 'loadout-hero';
      this.uiLayer.addChild(heroPanel);
    }
    const relicPanel = this.buildItemPanel('relic', RELIC_PANEL.x);
    relicPanel.label = 'loadout-relic';
    const companionPanel = this.buildItemPanel('companion', COMPANION_PANEL.x);
    companionPanel.label = 'loadout-companion';
    this.uiLayer.addChild(relicPanel, companionPanel);
  }

  /** Construit le visuel complet d'un Astre incarné (corps, visage, accessoire, badge). */
  private buildAstreVisual(tierIndex: number): AstreVisual {
    if (!this.world) throw new Error('MergeDrop world is not loaded');
    const tier = this.world.config.tiers[tierIndex]!;
    const root = new Container() as AstreVisual;
    const radius = tier.radius;
    const base = colorNumber(tier.color);
    const shape = new Graphics();

    // Halo doux (deux couches) pour détacher le personnage du décor.
    shape.circle(0, 0, radius * 1.24).fill({ color: base, alpha: 0.05 });
    shape.circle(0, 0, radius * 1.1).fill({ color: base, alpha: 0.09 });

    // Robe d'astre avec ombrage en couches (bas sombre → cœur lumineux décalé).
    shape.circle(0, 0, radius).fill({ color: mixColor(tier.color, 0x020617, 0.55), alpha: 0.98 });
    shape.circle(-radius * 0.06, -radius * 0.08, radius * 0.94).fill({ color: mixColor(tier.color, 0x020617, 0.22), alpha: 0.98 });
    shape.circle(-radius * 0.12, -radius * 0.16, radius * 0.8).fill({ color: base, alpha: 0.95 });
    shape.circle(-radius * 0.2, -radius * 0.26, radius * 0.5).fill({ color: mixColor(tier.color, 0xffffff, 0.22), alpha: 0.5 });
    // Reflet spéculaire en arc.
    shape.arc(0, 0, radius * 0.82, Math.PI * 1.12, Math.PI * 1.46)
      .stroke({ color: 0xffffff, alpha: 0.4, width: Math.max(1.6, radius * 0.06) });

    // Capuche et visage.
    shape.circle(0, -radius * 0.12, radius * 0.8).fill({ color: mixColor(tier.color, 0x020617, 0.36), alpha: 0.96 });
    shape.circle(0, -radius * 0.2, radius * 0.72).fill({ color: mixColor(tier.color, 0x020617, 0.26), alpha: 0.9 });
    shape.circle(0, radius * 0.06, radius * 0.58).fill({ color: mixColor(tier.color, 0xffffff, 0.76), alpha: 0.99 });
    shape.circle(0, radius * 0.02, radius * 0.56).fill({ color: mixColor(tier.color, 0xffffff, 0.84), alpha: 0.6 });

    const eyeY = radius * 0.02;
    const starEyes = tierIndex >= this.world.config.tiers.length - 1;
    const iris = mixColor(tier.color, 0x1e293b, 0.35);
    for (const side of [-1, 1]) {
      const eyeX = side * radius * 0.22;
      if (starEyes) {
        for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as Array<[number, number]>) {
          shape.circle(eyeX + dx * radius * 0.045, eyeY + dy * radius * 0.045, radius * 0.045)
            .fill({ color: 0xfacc15, alpha: 0.95 });
        }
        shape.circle(eyeX, eyeY, radius * 0.055).fill({ color: 0xfff7df, alpha: 1 });
      } else {
        // Œil : sclère, iris teinté, pupille, double reflet.
        shape.ellipse(eyeX, eyeY, Math.max(2.4, radius * 0.115), Math.max(2.8, radius * 0.135))
          .fill({ color: 0xffffff, alpha: 0.96 });
        shape.circle(eyeX, eyeY + radius * 0.015, Math.max(1.8, radius * 0.085)).fill({ color: iris, alpha: 1 });
        shape.circle(eyeX, eyeY + radius * 0.03, Math.max(1, radius * 0.045)).fill({ color: 0x0f172a, alpha: 1 });
        shape.circle(eyeX - side * radius * 0.03, eyeY - radius * 0.035, Math.max(0.8, radius * 0.03))
          .fill({ color: 0xffffff, alpha: 0.95 });
        shape.circle(eyeX + side * radius * 0.02, eyeY + radius * 0.05, Math.max(0.5, radius * 0.016))
          .fill({ color: 0xffffff, alpha: 0.7 });
      }
      shape.circle(side * radius * 0.36, radius * 0.2, Math.max(1.6, radius * 0.07)).fill({ color: 0xfb7185, alpha: 0.34 });
    }
    shape.arc(0, radius * 0.14, radius * 0.13, Math.PI * 0.16, Math.PI * 0.84)
      .stroke({ color: 0x1e293b, alpha: 0.85, width: Math.max(1.2, radius * 0.045) });

    this.drawTierAccessory(shape, tierIndex, radius, base);

    // Paillettes d'étoiles pour les hauts rangs.
    if (tierIndex >= 3) {
      for (let i = 0; i < 3 + tierIndex; i++) {
        const angle = (Math.PI * 2 * i) / (3 + tierIndex) + tierIndex * 0.7;
        const distance = radius * (0.94 + (i % 2) * 0.18);
        const sx = Math.cos(angle) * distance;
        const sy = Math.sin(angle) * distance;
        const size = Math.max(1.2, radius * 0.05);
        shape.moveTo(sx - size, sy).lineTo(sx + size, sy)
          .stroke({ color: 0xfff7df, alpha: 0.7, width: 1.2 });
        shape.moveTo(sx, sy - size).lineTo(sx, sy + size)
          .stroke({ color: 0xfff7df, alpha: 0.7, width: 1.2 });
      }
    }

    shape.circle(0, 0, radius).stroke({ color: 0xe7b75e, alpha: 0.92, width: Math.max(2, radius * 0.045) });

    // Badge de rang, pour garder la lecture de fusion instantanée.
    const badgeRadius = Math.max(8, radius * 0.2);
    shape.circle(radius * 0.6, radius * 0.6, badgeRadius)
      .fill({ color: 0x041521, alpha: 0.92 })
      .stroke({ color: 0xe7b75e, alpha: 0.9, width: Math.max(1.2, radius * 0.03) });
    root.addChild(shape);

    // Les Astres sont de vrais portraits de Gardiens, comme des médaillons
    // vivants. La géométrie physique reste strictement circulaire et lisible.
    const guardian = this.world.config.heroes[tierIndex % this.world.config.heroes.length];
    const portraitTexture = guardian ? this.heroTextures.get(guardian.id) : undefined;
    if (portraitTexture) {
      const portrait = new Sprite(portraitTexture);
      portrait.anchor.set(0.5, 0.5);
      const portraitScale = Math.max((radius * 1.82) / portraitTexture.width, (radius * 1.82) / portraitTexture.height);
      portrait.scale.set(portraitScale);
      portrait.y = -radius * 0.02;
      const mask = new Graphics();
      mask.circle(0, 0, radius * 0.91).fill(0xffffff);
      portrait.mask = mask;
      root.addChild(portrait, mask);
      const portraitRing = new Graphics();
      portraitRing.circle(0, 0, radius * 0.94)
        .stroke({ color: mixColor(tier.color, 0xffffff, 0.7), alpha: 0.72, width: Math.max(1.5, radius * 0.035) });
      portraitRing.arc(0, 0, radius * 0.82, Math.PI * 1.12, Math.PI * 1.52)
        .stroke({ color: 0xffffff, alpha: 0.55, width: Math.max(1.3, radius * 0.045) });
      root.addChild(portraitRing);
      root.portraitSprite = portrait;
      root.portraitBaseScale = portraitScale;
    }
    const rune = textNode(String(tierIndex + 1), Math.max(10, badgeRadius * 1.15), 0xfff7df, 'bold');
    rune.anchor.set(0.5, 0.5);
    rune.x = radius * 0.6;
    rune.y = radius * 0.6;
    root.addChild(rune);

    if (radius >= 40) {
      const name = textNode(tier.persona, Math.max(11, radius * 0.2), 0xfff7df, 'bold');
      name.anchor.set(0.5, 0.5);
      name.y = radius * 0.56;
      name.alpha = 0.92;
      root.addChild(name);
    }
    return root;
  }

  private createBallView(ball: MergeDropBall): BallView {
    const root = this.buildAstreVisual(ball.tier);
    this.ballLayer.addChild(root);
    return { root, ball };
  }

  private drawTierAccessory(shape: Graphics, tierIndex: number, radius: number, base: number): void {
    const topY = -radius * 0.62;
    if (tierIndex === 0) {
      // Pio : antenne étoilée.
      shape.moveTo(0, topY).lineTo(0, topY - radius * 0.3)
        .stroke({ color: 0xfff7df, alpha: 0.85, width: Math.max(1.2, radius * 0.05) });
      shape.circle(0, topY - radius * 0.38, Math.max(2, radius * 0.1)).fill({ color: 0xfff7df, alpha: 0.95 });
    } else if (tierIndex === 1) {
      // Lumi : goutte de rosée.
      shape.circle(radius * 0.3, topY - radius * 0.08, Math.max(2.5, radius * 0.14))
        .fill({ color: 0xbae6fd, alpha: 0.95 });
    } else if (tierIndex === 2) {
      // Séla : croissant de lune.
      shape.circle(-radius * 0.34, topY, radius * 0.2).fill({ color: 0xfff7df, alpha: 0.95 });
      shape.circle(-radius * 0.26, topY - radius * 0.06, radius * 0.16)
        .fill({ color: mixColor('#818cf8', 0x020617, 0.34), alpha: 1 });
    } else if (tierIndex === 3) {
      // Kori : traînée de comète.
      for (let i = 0; i < 3; i++) {
        shape.circle(radius * (0.42 + i * 0.18), topY - radius * (0.06 + i * 0.1), Math.max(1.6, radius * (0.1 - i * 0.024)))
          .fill({ color: 0xfff7df, alpha: 0.85 - i * 0.22 });
      }
    } else if (tierIndex === 4) {
      // Hélio : rayons solaires.
      for (let ray = 0; ray < 7; ray++) {
        const angle = Math.PI * (1.12 + ray * 0.13);
        shape.moveTo(Math.cos(angle) * radius * 0.82, Math.sin(angle) * radius * 0.82)
          .lineTo(Math.cos(angle) * radius * 1.02, Math.sin(angle) * radius * 1.02)
          .stroke({ color: 0xfde68a, alpha: 0.8, width: Math.max(1.4, radius * 0.04) });
      }
    } else if (tierIndex === 5) {
      // Auriel : couronne.
      const crownY = topY - radius * 0.06;
      shape.poly([
        -radius * 0.3, crownY,
        -radius * 0.2, crownY - radius * 0.24,
        -radius * 0.1, crownY,
        0, crownY - radius * 0.3,
        radius * 0.1, crownY,
        radius * 0.2, crownY - radius * 0.24,
        radius * 0.3, crownY,
      ]).fill({ color: 0xfacc15, alpha: 0.95 });
    } else if (tierIndex === 6) {
      // Gaïa : anneau orbital.
      shape.ellipse(0, radius * 0.04, radius * 1.06, radius * 0.3)
        .stroke({ color: 0xd9f99d, alpha: 0.65, width: Math.max(1.6, radius * 0.035) });
    } else {
      // Astra : halo du Nexus.
      shape.ellipse(0, topY - radius * 0.18, radius * 0.42, radius * 0.12)
        .stroke({ color: 0xfacc15, alpha: 0.9, width: Math.max(2, radius * 0.045) });
      shape.circle(0, 0, radius * 0.88)
        .stroke({ color: mixColor(`#${base.toString(16).padStart(6, '0')}`, 0xffffff, 0.4), alpha: 0.35, width: Math.max(1.4, radius * 0.02) });
    }
  }

  private syncBallViews(): void {
    if (!this.world) return;
    const active = new Set(this.world.balls.map((ball) => ball.id));
    for (const [id, view] of this.ballViews) {
      if (!active.has(id)) {
        view.root.destroy({ children: true });
        this.ballViews.delete(id);
      }
    }
    for (const ball of this.world.balls) {
      let view = this.ballViews.get(ball.id);
      if (!view) {
        view = this.createBallView(ball);
        this.ballViews.set(ball.id, view);
      }
      view.ball = ball;
      view.root.x = ball.x;
      view.root.y = ball.y;
      const idlePhase = this.world.elapsed_ms / 620 + ball.id * 0.73;
      const breathe = 1 + Math.sin(idlePhase) * 0.012;
      view.root.scale.set(breathe);
      view.root.rotation = Math.max(-0.08, Math.min(0.08, ball.vx / 2200));
      if (view.root.portraitSprite && view.root.portraitBaseScale) {
        const portraitPulse = 1 + Math.sin(idlePhase * 0.83) * 0.018;
        view.root.portraitSprite.scale.set(view.root.portraitBaseScale * portraitPulse);
        view.root.portraitSprite.y = -ball.tier * 0.15 + Math.sin(idlePhase * 0.7) * 0.9;
      }
    }
  }

  private spawnMergeSparks(event: Extract<MergeDropEvent, { type: 'merge' }>): void {
    if (!this.world) return;
    const color = colorNumber(this.world.config.tiers[event.tier]?.color ?? '#ffffff');
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16 + (event.tier % 3) * 0.2;
      const speed = 82 + (i % 5) * 24;
      const gfx = new Graphics();
      gfx.circle(0, 0, 2.5 + (i % 3)).fill({ color, alpha: 0.92 });
      gfx.x = event.x;
      gfx.y = event.y;
      this.fxLayer.addChild(gfx);
      this.sparks.push({ gfx, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 520, maxLife: 520 });
    }
    this.flashAlpha = Math.max(this.flashAlpha, 0.12 + event.tier * 0.025);

    // Onde de choc à chaque fusion.
    const radius = this.world.config.tiers[event.tier]?.radius ?? 30;
    const wave = new Graphics();
    this.fxLayer.addChild(wave);
    this.waves.push({ gfx: wave, x: event.x, y: event.y, r0: radius * 0.7, color, life: 460, maxLife: 460 });

    // Score flottant (doré dès la cascade ×3).
    this.spawnFloater(
      `+${event.points}${event.combo > 1 ? `  ×${event.combo}` : ''}`,
      event.x,
      event.y - radius * 0.8,
      event.combo >= 3 ? 0xfacc15 : 0xf8fafc,
      event.combo >= 3 ? 24 : 19,
    );

    // Secousse d'écran sur les grosses fusions.
    if (event.tier >= 5) {
      this.shakeMs = 260;
      this.shakeStrength = 2 + (event.tier - 4) * 2;
    }
  }

  private spawnFloater(label: string, x: number, y: number, color: number, size = 19): void {
    const node = textNode(label, size, color, 'bold');
    node.anchor.set(0.5, 0.5);
    node.x = Math.max(90, Math.min(WIDTH - 90, x));
    node.y = y;
    this.fxLayer.addChild(node);
    this.floaters.push({ node, life: 900, maxLife: 900 });
  }

  private spawnDissolveSparks(x: number, y: number, tierIndex: number): void {
    if (!this.world) return;
    const color = colorNumber(this.world.config.tiers[tierIndex]?.color ?? '#ffffff');
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10;
      const speed = 60 + (i % 4) * 26;
      const gfx = new Graphics();
      gfx.circle(0, 0, 2 + (i % 3)).fill({ color, alpha: 0.85 });
      gfx.x = x;
      gfx.y = y;
      this.fxLayer.addChild(gfx);
      this.sparks.push({ gfx, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 40, life: 460, maxLife: 460 });
    }
  }

  private spawnUltBanner(heroId: string): void {
    if (!this.world) return;
    const hero = this.world.config.heroes.find((entry) => entry.id === heroId);
    if (!hero) return;
    const accent = colorNumber(hero.color, 0xfacc15);
    const root = new Container();
    root.x = WIDTH / 2;
    root.y = 560;
    const panel = new Graphics();
    panel.roundRect(-236, -52, 472, 104, 18)
      .fill({ color: 0x041521, alpha: 0.88 })
      .stroke({ color: accent, alpha: 0.95, width: 4 });
    panel.roundRect(-226, -42, 452, 84, 14)
      .stroke({ color: 0xf6d58a, alpha: 0.4, width: 1.5 });
    root.addChild(panel);
    const name = textNode(hero.name.toUpperCase(), 20, accent, 'bold');
    name.anchor.set(0.5, 0.5);
    name.y = -20;
    const label = textNode(hero.ability_label, 32, 0xfff7df, 'bold');
    label.anchor.set(0.5, 0.5);
    label.y = 16;
    root.addChild(name, label);
    this.fxLayer.addChild(root);
    this.banners.push({ root, life: 1600, maxLife: 1600 });
  }

  private consumeEvents(): void {
    if (!this.world) return;
    for (const event of drainMergeDropEvents(this.world)) {
      if (event.type === 'merge') {
        this.flash.tint = 0xffffff;
        this.spawnMergeSparks(event);
      }
      if (event.type === 'dissolve') this.spawnDissolveSparks(event.x, event.y, event.tier);
      if (event.type === 'ability') {
        const hero = this.world.config.heroes.find((entry) => entry.id === event.hero_id);
        this.flash.tint = colorNumber(hero?.color ?? '#ffffff');
        this.flashAlpha = event.overdrive ? 0.72 : 0.4;
        this.shakeMs = Math.max(this.shakeMs, event.overdrive ? 520 : 220);
        this.shakeStrength = Math.max(this.shakeStrength, event.overdrive ? 9 : 4);
        this.spawnUltBanner(event.hero_id);
        window.dispatchEvent(new CustomEvent(ABILITY_CAST_EVENT, {
          detail: {
            heroId: hero?.id,
            heroName: hero?.name,
            abilityName: hero?.ability_label,
            portraitFrame: hero?.portrait_frame,
            color: hero?.color,
            overdrive: event.overdrive,
            potency: event.potency,
          },
        }));
      }
      if (event.type === 'companion_proc') {
        const companion = this.world.config.companions.find((entry) => entry.id === event.companion_id);
        this.spawnFloater(event.label, WIDTH / 2, 360, colorNumber(companion?.color ?? '#67e8f9'), 21);
      }
      if (event.type === 'boss_hit') {
        this.spawnFloater(`−${event.damage} PV`, WIDTH / 2, 224, 0xfca5a5, 24);
        this.shakeMs = Math.max(this.shakeMs, 90 + event.phase * 25);
        this.shakeStrength = Math.max(this.shakeStrength, 1.5 + event.phase);
      }
      if (event.type === 'boss_attack') {
        const label = event.attack === 'gravity_surge'
          ? 'VAGUE GRAVITATIONNELLE'
          : event.attack === 'void_seed'
            ? 'GRAINE DU VIDE'
            : 'FRACTURE STELLAIRE';
        this.spawnFloater(label, WIDTH / 2, 264, 0xf0abfc, 22);
        this.flash.tint = 0xa855f7;
        this.flashAlpha = 0.2;
      }
      if (event.type === 'mission_complete') {
        this.flash.tint = 0xfef3c7;
        this.flashAlpha = 0.48;
        const rewards = `+${event.reward_currency} éclats${event.reward_essence ? ` · +${event.reward_essence} essence` : ''}`;
        this.spawnFloater(rewards, WIDTH / 2, 314, 0xfacc15, 23);
      }
      if (
        event.type === 'merge'
        || event.type === 'summon'
        || event.type === 'relic_summon'
        || event.type === 'evolution'
        || event.type === 'ability'
        || event.type === 'awaken'
        || event.type === 'mission_complete'
        || event.type === 'game_over'
        || event.type === 'target_reached'
      ) {
        this.persistProgress();
      }
    }
  }

  private updateSparks(dtMs: number): void {
    const dt = dtMs / 1000;
    for (const spark of this.sparks) {
      spark.life -= dtMs;
      spark.vy += 180 * dt;
      spark.gfx.x += spark.vx * dt;
      spark.gfx.y += spark.vy * dt;
      spark.gfx.alpha = Math.max(0, spark.life / spark.maxLife);
    }
    const alive: Spark[] = [];
    for (const spark of this.sparks) {
      if (spark.life > 0) alive.push(spark);
      else spark.gfx.destroy();
    }
    this.sparks = alive;

    const liveBanners: UltBanner[] = [];
    for (const banner of this.banners) {
      banner.life -= dtMs;
      banner.root.y -= (dtMs / 1000) * 22;
      banner.root.alpha = Math.max(0, Math.min(1, banner.life / (banner.maxLife * 0.32)));
      if (banner.life > 0) liveBanners.push(banner);
      else banner.root.destroy({ children: true });
    }
    this.banners = liveBanners;

    const liveWaves: ShockWave[] = [];
    for (const wave of this.waves) {
      wave.life -= dtMs;
      const progress = 1 - Math.max(0, wave.life / wave.maxLife);
      const radius = wave.r0 + progress * wave.r0 * 1.6;
      wave.gfx.clear();
      wave.gfx.circle(wave.x, wave.y, radius)
        .stroke({ color: wave.color, alpha: Math.max(0, 0.55 * (1 - progress)), width: Math.max(1.5, 5 * (1 - progress)) });
      if (wave.life > 0) liveWaves.push(wave);
      else wave.gfx.destroy();
    }
    this.waves = liveWaves;

    const liveFloaters: Floater[] = [];
    for (const floater of this.floaters) {
      floater.life -= dtMs;
      floater.node.y -= (dtMs / 1000) * 46;
      floater.node.alpha = Math.max(0, Math.min(1, floater.life / (floater.maxLife * 0.45)));
      if (floater.life > 0) liveFloaters.push(floater);
      else floater.node.destroy();
    }
    this.floaters = liveFloaters;

    // Secousse d'écran (grosses fusions, ults).
    this.shakeMs = Math.max(0, this.shakeMs - dtMs);
    if (this.shakeMs > 0) {
      const falloff = this.shakeMs / 260;
      this.root.x = (Math.random() - 0.5) * 2 * this.shakeStrength * falloff;
      this.root.y = (Math.random() - 0.5) * 2 * this.shakeStrength * falloff;
    } else {
      this.root.x = 0;
      this.root.y = 0;
      this.shakeStrength = 0;
    }

    this.flashAlpha = Math.max(0, this.flashAlpha - dtMs / 420);
    this.flash.alpha = this.flashAlpha;
  }

  private drawDynamicGuides(): void {
    if (!this.world) return;
    if (this.world.game_over || this.world.target_reached) {
      this.dangerLine.clear();
      this.aimGuide.clear();
      if (this.aimPreview) this.aimPreview.alpha = 0;
      return;
    }
    const board = this.world.config.board;
    const overflowRatio = Math.min(1, this.world.overflow_ms / this.world.config.overflow_grace_ms);
    this.dangerLine.clear();
    this.dangerLine.moveTo(board.x + 14, board.loss_line_y).lineTo(board.x + board.width - 14, board.loss_line_y)
      .stroke({ color: overflowRatio > 0 ? 0xfb7185 : 0xf59e0b, alpha: 0.35 + overflowRatio * 0.55, width: 3 });
    for (let x = board.x + 18; x < board.x + board.width - 10; x += 30) {
      this.dangerLine.circle(x, board.loss_line_y, 2).fill({ color: 0xf59e0b, alpha: 0.32 });
    }

    const previewTier = this.world.forge_next
      ? Math.min(this.world.current_tier + Math.max(1, this.world.forge_boost), this.world.config.tiers.length - 1)
      : this.world.current_tier;
    const tier = this.world.config.tiers[previewTier]!;
    this.aimGuide.clear();
    this.aimGuide.moveTo(this.world.aim_x, board.y + tier.radius * 2 + 14).lineTo(this.world.aim_x, board.y + board.height - 10)
      .stroke({ color: colorNumber(tier.color), alpha: 0.34, width: 2 });

    // Prévisualisation réelle : le personnage qui va descendre, en semi-transparence.
    if (previewTier !== this.aimPreviewTier) {
      this.aimPreview?.destroy({ children: true });
      this.aimPreview = this.buildAstreVisual(previewTier);
      this.aimPreviewTier = previewTier;
      this.ballLayer.addChild(this.aimPreview);
    }
    if (this.aimPreview) {
      const bob = Math.sin(this.world.elapsed_ms / 320) * 3;
      this.aimPreview.x = this.world.aim_x;
      this.aimPreview.y = board.y + tier.radius + 10 + bob;
      this.aimPreview.alpha = this.world.drop_cooldown_ms > 0 ? 0.3 : 0.62;
    }

    // Miniature de l'Astre suivant, à côté du libellé « suivant ».
    if (this.world.next_tier !== this.nextPreviewTier) {
      this.nextPreview?.destroy({ children: true });
      this.nextPreview = this.buildAstreVisual(this.world.next_tier);
      this.nextPreviewTier = this.world.next_tier;
      const nextRadius = this.world.config.tiers[this.world.next_tier]!.radius;
      this.nextPreview.scale.set(19 / nextRadius);
      this.nextPreview.x = 460;
      this.nextPreview.y = 80;
      this.uiLayer.addChild(this.nextPreview);
    }
  }

  private renderHud(): void {
    if (!this.world) return;
    const selected = this.world.config.heroes.find((hero) => hero.id === this.world?.selected_hero_id);
    const current = this.world.config.tiers[this.world.current_tier];
    const next = this.world.config.tiers[this.world.next_tier];
    const rules = this.world.run_rules;
    this.scoreText.text = `SCORE ${this.world.score.toString().padStart(6, '0')}`;
    this.currencyText.text = `Éclats ${this.world.currency}  ·  Essence ${this.world.essence}`;
    this.nextText.text = `${current?.persona ?? ''}  →  ${next?.persona ?? ''}`;
    this.comboText.text = this.world.combo > 1 ? `CASCADE x${this.world.combo}` : '';
    const targetTier = this.world.config.tiers[rules.target_tier ?? this.world.config.tiers.length - 1];
    this.objectiveText.text = rules.objective_label
      ?? (rules.mode === 'boss'
        ? `Brisez ${rules.boss_name ?? 'le boss'} avec vos fusions`
        : rules.mode === 'score'
          ? `Atteignez ${rules.target_score ?? 1200} points avant la fermeture`
          : rules.mode === 'survival'
            ? 'Survivez jusqu’à la stabilisation de la faille'
            : `Réunissez les Astres jusqu’à ${targetTier?.persona ?? 'Astra'}`);
    const remaining = Math.max(0, Math.ceil(this.world.mission_time_remaining_ms / 1000));
    this.missionText.text = rules.mode === 'boss'
      ? `${rules.boss_name ?? 'BOSS'} · ${Math.ceil(this.world.boss_hp)}/${this.world.boss_max_hp} · PHASE ${this.world.boss_phase}`
      : (rules.time_limit_ms ?? 0) > 0
        ? `${rules.name.toUpperCase()} · ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`
        : rules.name.toUpperCase();
    if (selected) {
      const level = mergeDropHeroLevel(this.world, selected.id);
      const levelTag = level > 0 ? ` Nv${level}` : '';
      const charge = Math.floor(this.world.ability_charge);
      const state = charge >= 200 ? 'SUPER PRÊT' : charge >= 100 ? 'ULTIME PRÊT' : 'EN CHARGE';
      this.abilityText.text = `${state} · ${selected.ability_label}${levelTag}\n${charge}/200`;
    } else {
      this.abilityText.text = 'Ult indisponible';
    }
    this.sanctuaryText.text = `Sanctuaire ✦ Invoquer\npitié ${this.world.pity}/${this.world.config.pity_after}`;
    this.statusText.text = this.world.game_over
      ? 'Mission rompue — touchez pour recommencer'
      : this.world.target_reached
        ? rules.mode === 'boss' ? 'Boss vaincu — route céleste libérée' : 'Objectif accompli — constellation restaurée'
        : this.world.overflow_ms > 0
          ? 'Danger — libérez la ligne astrale'
          : 'Touchez la cuve pour faire descendre un Astre';
  }

  private clearOverlay(): void {
    for (const child of this.overlayLayer.removeChildren()) child.destroy({ children: true });
  }

  private centeredText(value: string, size: number, color: number, y: number, weight: 'normal' | 'bold' = 'normal'): Text {
    const node = textNode(value, size, color, weight);
    node.anchor.set(0.5, 0.5);
    node.x = WIDTH / 2;
    node.y = y;
    return node;
  }

  private renderOverlay(): void {
    if (!this.world) return;
    const fingerprint = this.world.target_reached
      ? `victory:${this.world.run_rules.id}:${this.world.nexus_completions}:${this.world.score}`
      : this.world.game_over
        ? `defeat:${this.world.run_rules.id}:${this.world.score}`
        : '';
    if (fingerprint === this.overlayFingerprint) return;
    this.overlayFingerprint = fingerprint;
    this.clearOverlay();
    if (!fingerprint) return;

    if (this.world.target_reached || this.world.game_over) {
      const victory = this.world.target_reached;
      const rules = this.world.run_rules;
      const shade = new Graphics();
      shade.rect(0, 0, WIDTH, HEIGHT).fill({ color: 0x020812, alpha: 0.7 });
      shade.roundRect(70, 286, 580, 640, 28)
        .fill({ color: 0x061b29, alpha: 0.96 })
        .stroke({ color: victory ? 0xf6d58a : 0xfb7185, alpha: 0.95, width: 4 });
      shade.roundRect(84, 300, 552, 612, 22)
        .stroke({ color: 0x67e8f9, alpha: 0.42, width: 2 });
      shade.circle(WIDTH / 2, 398, 66)
        .fill({ color: victory ? 0xd6a84f : 0x7f1d1d, alpha: 0.34 })
        .stroke({ color: victory ? 0xfacc15 : 0xfb7185, alpha: 0.86, width: 4 });
      for (let ray = 0; ray < 8; ray++) {
        const angle = (Math.PI * 2 * ray) / 8;
        shade.moveTo(WIDTH / 2 + Math.cos(angle) * 38, 398 + Math.sin(angle) * 38)
          .lineTo(WIDTH / 2 + Math.cos(angle) * 58, 398 + Math.sin(angle) * 58)
          .stroke({ color: 0xfff7df, alpha: 0.68, width: 3 });
      }
      shade.roundRect(RESULT_BUTTON.x, RESULT_BUTTON.y, RESULT_BUTTON.width, RESULT_BUTTON.height, 16)
        .fill({ color: victory ? 0x0f766e : 0x9f3b3b, alpha: 0.92 })
        .stroke({ color: 0xf6d58a, alpha: 0.92, width: 3 });
      this.overlayLayer.addChild(shade);
      this.overlayLayer.addChild(
        this.centeredText(
          victory ? (rules.mode === 'boss' ? 'BOSS VAINCU' : 'MISSION ACCOMPLIE') : 'MISSION ROMPUE',
          42,
          0xfff7df,
          500,
          'bold',
        ),
        this.centeredText(
          victory ? `${rules.name} ouvre une nouvelle route céleste.` : 'La faille a submergé le Puits astral.',
          22,
          0xdbeafe,
          556,
        ),
        this.centeredText(`Score ${this.world.score}  ·  Éclats ${this.world.currency}`, 24, 0xfacc15, 628, 'bold'),
        this.centeredText(`Essence ${this.world.essence}  ·  Nexus ${this.world.nexus_completions}`, 21, 0x67e8f9, 670),
        this.centeredText(victory ? 'Continuer' : 'Réessayer', 28, 0xffffff, RESULT_BUTTON.y + RESULT_BUTTON.height / 2, 'bold'),
      );
      if (fingerprint !== this.resultEventFingerprint) {
        this.resultEventFingerprint = fingerprint;
        window.dispatchEvent(new CustomEvent(RUN_RESULT_EVENT, {
          detail: {
            missionId: rules.id,
            victory,
            score: this.world.score,
            bestTier: this.world.best_tier,
            elapsedMs: this.world.elapsed_ms,
            timeRemainingMs: this.world.mission_time_remaining_ms,
            bossHp: this.world.boss_hp,
          },
        }));
      }
    }
  }

  private renderFrame(dtMs: number): void {
    this.syncBallViews();
    this.drawDynamicGuides();
    this.renderHud();
    this.refreshLoadout();
    this.renderOverlay();
    this.updateSparks(dtMs);
  }

  private tick = (): void => {
    if (!this.app || !this.world) return;
    if (this.paused) return;
    const dtMs = this.app.ticker.deltaMS;
    if (!this.world.game_over && !this.world.target_reached) {
      const speed = 310 * (dtMs / 1000);
      if (this.keys.has('ArrowLeft') || this.keys.has('a') || this.keys.has('A')) {
        setMergeDropAim(this.world, this.world.aim_x - speed);
      }
      if (this.keys.has('ArrowRight') || this.keys.has('d') || this.keys.has('D')) {
        setMergeDropAim(this.world, this.world.aim_x + speed);
      }
    }
    stepMergeDropWorld(this.world, dtMs);
    this.consumeEvents();
    this.renderFrame(dtMs);
  };

  private pointerPosition(event: PointerEvent): { x: number; y: number } | null {
    if (!this.app) return null;
    const rect = this.app.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: ((event.clientX - rect.left) / rect.width) * this.app.screen.width,
      y: ((event.clientY - rect.top) / rect.height) * this.app.screen.height,
    };
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.world || this.paused) return;
    const point = this.pointerPosition(event);
    if (!point) return;
    if (this.world.game_over || this.world.target_reached) {
      if (
        point.x >= RESULT_BUTTON.x
        && point.x <= RESULT_BUTTON.x + RESULT_BUTTON.width
        && point.y >= RESULT_BUTTON.y
        && point.y <= RESULT_BUTTON.y + RESULT_BUTTON.height
      ) {
        this.resetRun();
      }
      return;
    }
    const board = this.world.config.board;
    if (point.x >= board.x && point.x <= board.x + board.width) setMergeDropAim(this.world, point.x);
  }

  private openSanctuary(): void {
    this.persistProgress();
    window.dispatchEvent(new CustomEvent(OPEN_SUMMON_EVENT));
  }

  private onPointerDown(event: PointerEvent): void {
    if (!this.world || this.paused) return;
    const point = this.pointerPosition(event);
    if (!point) return;
    const board = this.world.config.board;
    if (point.x >= board.x && point.x <= board.x + board.width && point.y >= board.y && point.y <= board.y + board.height) {
      setMergeDropAim(this.world, point.x);
      dropMergeBall(this.world);
      return;
    }
    if (point.y >= LOADOUT_Y && point.y <= LOADOUT_Y + LOADOUT_H) {
      // Le loadout se gère au hub : Gardien → Galerie, relique/compagnon → Reliquaire.
      if (point.x >= HERO_PANEL.x && point.x <= HERO_PANEL.x + HERO_PANEL.width) {
        this.persistProgress();
        window.dispatchEvent(new CustomEvent(OPEN_GALLERY_EVENT));
      } else if (point.x >= RELIC_PANEL.x && point.x <= COMPANION_PANEL.x + COMPANION_PANEL.width) {
        this.persistProgress();
        window.dispatchEvent(new CustomEvent(OPEN_RELIQUARY_EVENT));
      }
      return;
    }
    if (point.y >= ACTION_Y && point.y <= ACTION_Y + ACTION_H) {
      if (point.x >= ULT_BUTTON.x && point.x <= ULT_BUTTON.x + ULT_BUTTON.width) activateMergeDropAbility(this.world);
      if (point.x >= SANCTUARY_BUTTON.x && point.x <= SANCTUARY_BUTTON.x + SANCTUARY_BUTTON.width) this.openSanctuary();
    }
  }

  private resetRun(rules?: Partial<MergeDropRunRules>): void {
    if (!this.gdl || !this.world) return;
    const progress = mergeDropProgressFromWorld(this.world);
    const nextRules = rules ?? this.world.run_rules;
    this.world = createMergeDropWorldFromGdl(this.gdl, (Date.now() ^ 0x51a7f00d) >>> 0, nextRules);
    applyMergeDropProgress(this.world, progress);
    primeMergeDropRun(this.world);
    for (const view of this.ballViews.values()) view.root.destroy({ children: true });
    this.ballViews.clear();
    this.heroFingerprint = '';
    this.overlayFingerprint = '';
    this.resultEventFingerprint = '';
    this.clearOverlay();
    this.persistProgress();
  }

  private onKey(event: KeyboardEvent, down: boolean): void {
    if (this.paused) return;
    const handled = [
      'ArrowLeft', 'ArrowRight', 'ArrowDown', ' ', 'Enter',
      'a', 'A', 'd', 'D', 'g', 'G', 'h', 'H', 'r', 'R',
    ];
    if (!handled.includes(event.key)) return;
    event.preventDefault();
    if (down) this.keys.add(event.key);
    else this.keys.delete(event.key);
    if (!down || event.repeat || !this.world) return;
    if (event.key === ' ') activateMergeDropAbility(this.world);
    if (event.key === 'Enter' || event.key === 'ArrowDown') dropMergeBall(this.world);
    if (event.key === 'g' || event.key === 'G' || event.key === 'h' || event.key === 'H') this.openSanctuary();
    if (event.key === 'r' || event.key === 'R') this.resetRun();
  }

  destroy(): void {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    if (this.app) {
      this.app.canvas.removeEventListener('pointermove', this.boundPointerMove);
      this.app.canvas.removeEventListener('pointerdown', this.boundPointerDown);
      this.app.ticker.remove(this.tick);
      this.app.destroy(true, { children: true });
    }
    this.app = null;
    this.world = null;
    this.gdl = null;
    this.ballViews.clear();
    this.heroTextures.clear();
    this.sparks = [];
    this.banners = [];
  }
}
