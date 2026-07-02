/**
 * Écrans meta Veloria — hub, invocation, bénédictions, victoire (Pixi overlay).
 */
import { Assets, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { VELORIA_GACHA } from './veloria-style.js';

export type VeloriaScreenId = 'hub' | 'invoke' | 'combat' | 'victory' | 'game_over' | 'blessing';

export interface VeloriaScreenState {
  screen: VeloriaScreenId;
  title: string;
  score?: number;
  arenaTitle?: string;
  blessingPicks?: { id: string; label: string; effect?: string }[];
  heroTexture?: Texture | null;
  bgTexture?: Texture | null;
}

export class VeloriaScreenLayer {
  readonly root = new Container();
  private bg = new Sprite();
  private overlay = new Graphics();
  private titleText = new Text({ text: '', style: { fill: VELORIA_GACHA.goldLight, fontSize: 26, fontFamily: 'Georgia, serif', fontWeight: 'bold' } });
  private subText = new Text({ text: '', style: { fill: VELORIA_GACHA.gold, fontSize: 14, fontFamily: 'Georgia, serif' } });
  private hero = new Sprite();
  private cards = new Container();
  private viewW = 720;
  private viewH = 1280;

  constructor(viewW: number, viewH: number) {
    this.viewW = viewW;
    this.viewH = viewH;
    this.root.zIndex = 950_000;
    this.root.addChild(this.bg, this.overlay, this.hero, this.titleText, this.subText, this.cards);
    this.bg.visible = false;
    this.hero.visible = false;
  }

  update(state: VeloriaScreenState): void {
    const meta = state.screen !== 'combat';
    this.root.visible = meta;
    if (!meta) return;

    if (state.bgTexture) {
      this.bg.texture = state.bgTexture;
      this.bg.width = this.viewW;
      this.bg.height = this.viewH;
      this.bg.visible = true;
    } else {
      this.bg.visible = false;
      this.overlay.clear();
      this.overlay.rect(0, 0, this.viewW, this.viewH);
      this.overlay.fill(VELORIA_GACHA.bg);
    }

    this.overlay.clear();
    this.overlay.rect(0, 0, this.viewW, this.viewH);
    this.overlay.fill({ color: 0x07060a, alpha: state.screen === 'blessing' ? 0.82 : state.screen === 'hub' ? 0.35 : 0.75 });

    this.cards.removeChildren();

    if (state.screen === 'hub') {
      this.titleText.text = state.title;
      this.titleText.anchor.set(0.5, 0);
      this.titleText.x = this.viewW / 2;
      this.titleText.y = this.viewH * 0.17;
      this.subText.text = '[Entrée] Commencer · [1-6] Arène';
      this.subText.anchor.set(0.5, 0);
      this.subText.x = this.viewW / 2;
      this.subText.y = this.viewH * 0.72;
      if (state.heroTexture) {
        this.hero.texture = state.heroTexture;
        this.hero.width = 260;
        this.hero.height = 340;
        this.hero.anchor.set(0.5, 1);
        this.hero.x = this.viewW / 2;
        this.hero.y = this.viewH * 0.55;
        this.hero.visible = true;
      }
      return;
    }

    if (state.screen === 'invoke') {
      this.titleText.text = 'INVOCATION SACRÉE';
      this.titleText.anchor.set(0.5, 0.5);
      this.titleText.x = this.viewW / 2;
      this.titleText.y = this.viewH * 0.35;
      this.subText.text = '[Entrée] Continuer';
      this.subText.anchor.set(0.5, 0.5);
      this.subText.x = this.viewW / 2;
      this.subText.y = this.viewH * 0.68;
      return;
    }

    if (state.screen === 'blessing' && state.blessingPicks?.length) {
      this.titleText.text = 'CHOISISSEZ UNE BÉNÉDICTION';
      this.titleText.anchor.set(0.5, 0.5);
      this.titleText.x = this.viewW / 2;
      this.titleText.y = this.viewH * 0.28;
      this.subText.text = '[1] [2] [3]';
      this.subText.anchor.set(0.5, 0.5);
      this.subText.x = this.viewW / 2;
      this.subText.y = this.viewH * 0.32;
      drawBlessingCards(this.cards, state.blessingPicks, this.viewW, this.viewH);
      return;
    }

    if (state.screen === 'victory') {
      this.titleText.text = 'VEILLE ACCOMPLIE';
      this.titleText.style.fill = VELORIA_GACHA.gold;
      this.titleText.anchor.set(0.5, 0.5);
      this.titleText.x = this.viewW / 2;
      this.titleText.y = this.viewH * 0.4;
      this.subText.text = `${state.arenaTitle ?? ''}\nScore ${state.score ?? 0}\n[Entrée] Hub`;
      this.subText.anchor.set(0.5, 0.5);
      this.subText.x = this.viewW / 2;
      this.subText.y = this.viewH * 0.52;
      return;
    }

    if (state.screen === 'game_over') {
      this.titleText.text = 'VEILLE ROMPUE';
      this.titleText.style.fill = 0xa04040;
      this.titleText.anchor.set(0.5, 0.5);
      this.titleText.x = this.viewW / 2;
      this.titleText.y = this.viewH * 0.42;
      this.subText.text = `Score ${state.score ?? 0}\n[Entrée] Réessayer`;
      this.subText.anchor.set(0.5, 0.5);
      this.subText.x = this.viewW / 2;
      this.subText.y = this.viewH * 0.52;
    }
  }

  dispose(): void {
    this.root.destroy({ children: true });
  }
}

function drawBlessingCards(
  container: Container,
  picks: { id: string; label: string; effect?: string }[],
  viewW: number,
  viewH: number,
): void {
  const cardW = 200;
  const gap = 16;
  const total = picks.length * cardW + (picks.length - 1) * gap;
  let cx = (viewW - total) / 2 + cardW / 2;
  picks.forEach((b, i) => {
    const g = new Graphics();
    const y = viewH * 0.42;
    g.roundRect(-cardW / 2, 0, cardW, 260, 12);
    g.fill({ color: 0x5a3a72, alpha: 0.85 });
    g.stroke({ color: VELORIA_GACHA.gold, width: 2 });
    g.x = cx;
    g.y = y;
    const label = new Text({
      text: `[${i + 1}] ${b.label}`,
      style: { fill: VELORIA_GACHA.goldLight, fontSize: 14, wordWrap: true, wordWrapWidth: cardW - 20, align: 'center', fontFamily: 'Georgia, serif' },
    });
    label.anchor.set(0.5, 0);
    label.x = cx;
    label.y = y + 40;
    container.addChild(g, label);
    cx += cardW + gap;
  });
}

export async function loadTexture(url: string): Promise<Texture | null> {
  if (!url) return null;
  try {
    return await Assets.load<Texture>(url);
  } catch {
    return null;
  }
}
