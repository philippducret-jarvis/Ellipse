/** Écrans Veloria v2 — hub jouable, invocation, bénédictions et résultats. */
import { Assets, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { VELORIA_GACHA } from './veloria-style.js';

export type VeloriaScreenId = 'hub' | 'invoke' | 'combat' | 'victory' | 'game_over' | 'blessing';

export interface VeloriaScreenState {
  screen: VeloriaScreenId;
  title: string;
  score?: number;
  arenaTitle?: string;
  blessingPicks?: { id: string; label: string; effect?: string; rarity?: string }[];
  heroTexture?: Texture | null;
  bgTexture?: Texture | null;
  dtSec?: number;
}

export class VeloriaScreenLayer {
  readonly root = new Container();
  private bg = new Sprite();
  private veil = new Graphics();
  private ornaments = new Graphics();
  private titleText = new Text({
    text: '',
    style: {
      fill: VELORIA_GACHA.goldLight,
      fontSize: 42,
      fontFamily: 'Georgia, serif',
      fontWeight: 'bold',
      letterSpacing: 3,
      align: 'center',
      dropShadow: { color: 0x000000, alpha: 0.92, blur: 12, distance: 3 },
    },
  });
  private subText = new Text({
    text: '',
    style: {
      fill: VELORIA_GACHA.gold,
      fontSize: 15,
      lineHeight: 24,
      fontFamily: 'Georgia, serif',
      letterSpacing: 1.1,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: 590,
      dropShadow: { color: 0x000000, alpha: 0.9, blur: 7, distance: 2 },
    },
  });
  private hero = new Sprite();
  private cards = new Container();
  private phase = 0;

  constructor(private readonly viewW: number, private readonly viewH: number) {
    this.root.zIndex = 950_000;
    this.root.addChild(this.bg, this.veil, this.ornaments, this.hero, this.titleText, this.subText, this.cards);
    this.bg.visible = false;
    this.hero.visible = false;
  }

  update(state: VeloriaScreenState): void {
    this.phase += Math.max(0, Math.min(state.dtSec ?? 0, 0.05));
    const meta = state.screen !== 'combat';
    this.root.visible = meta;
    if (!meta) return;

    this.reset(state);
    if (state.screen === 'hub') this.drawHub(state);
    else if (state.screen === 'invoke') this.drawInvocation(state);
    else if (state.screen === 'blessing') this.drawBlessing(state);
    else if (state.screen === 'victory') this.drawResult(state, true);
    else if (state.screen === 'game_over') this.drawResult(state, false);
  }

  private reset(state: VeloriaScreenState): void {
    this.hero.visible = false;
    this.titleText.style.fill = VELORIA_GACHA.goldLight;
    this.titleText.style.fontSize = 42;
    this.titleText.text = '';
    this.titleText.rotation = 0;
    this.subText.text = '';
    this.cards.removeChildren().forEach((child) => child.destroy({ children: true }));

    if (state.bgTexture) {
      this.bg.texture = state.bgTexture;
      this.bg.width = this.viewW;
      this.bg.height = this.viewH;
      this.bg.visible = true;
    } else {
      this.bg.visible = false;
    }
    this.veil.clear();
    this.ornaments.clear();
  }

  private drawFrame(alpha = 0.9): void {
    const margin = 13;
    this.ornaments.roundRect(margin, margin, this.viewW - margin * 2, this.viewH - margin * 2, 26);
    this.ornaments.stroke({ color: 0x5f4927, width: 8, alpha });
    this.ornaments.roundRect(margin + 5, margin + 5, this.viewW - (margin + 5) * 2, this.viewH - (margin + 5) * 2, 22);
    this.ornaments.stroke({ color: VELORIA_GACHA.gold, width: 1.5, alpha });
    for (const [x, y] of [[margin + 18, margin + 18], [this.viewW - margin - 18, margin + 18], [margin + 18, this.viewH - margin - 18], [this.viewW - margin - 18, this.viewH - margin - 18]] as const) {
      this.ornaments.moveTo(x, y - 9).lineTo(x + 9, y).lineTo(x, y + 9).lineTo(x - 9, y).closePath();
      this.ornaments.fill({ color: VELORIA_GACHA.gold, alpha: 0.82 });
    }
  }

  private drawHub(state: VeloriaScreenState): void {
    this.veil.rect(0, 0, this.viewW, this.viewH).fill({ color: 0x07060a, alpha: 0.26 });
    this.veil.rect(0, 0, this.viewW, 250).fill({ color: 0x07060a, alpha: 0.72 });
    this.veil.rect(0, this.viewH - 300, this.viewW, 300).fill({ color: 0x07060a, alpha: 0.78 });
    this.veil.circle(this.viewW / 2, this.viewH * 0.53, 218).fill({ color: 0x0b0811, alpha: 0.14 });
    this.drawFrame();

    this.ornaments.circle(this.viewW / 2, this.viewH * 0.53, 202 + Math.sin(this.phase * 0.8) * 3);
    this.ornaments.stroke({ color: VELORIA_GACHA.gold, width: 1.2, alpha: 0.36 });
    this.ornaments.circle(this.viewW / 2, this.viewH * 0.53, 158 - Math.sin(this.phase * 0.8) * 3);
    this.ornaments.stroke({ color: 0x8c58ae, width: 1.5, alpha: 0.45 });

    this.titleText.text = state.title.toUpperCase();
    this.titleText.anchor.set(0.5, 0);
    this.titleText.x = this.viewW / 2;
    this.titleText.y = 73;

    const kicker = new Text({
      text: 'LE PAVILLON DES VEILLES',
      style: { fill: VELORIA_GACHA.gold, fontSize: 15, fontFamily: 'Georgia, serif', letterSpacing: 4 },
    });
    kicker.anchor.set(0.5, 0);
    kicker.x = this.viewW / 2;
    kicker.y = 136;
    this.cards.addChild(kicker);

    if (state.heroTexture) {
      this.hero.texture = state.heroTexture;
      this.hero.width = 278;
      this.hero.height = 294;
      this.hero.anchor.set(0.5, 1);
      this.hero.x = this.viewW / 2;
      this.hero.y = this.viewH * 0.67 + Math.sin(this.phase * 2.1) * 5;
      this.hero.rotation = Math.sin(this.phase * 1.25) * 0.008;
      this.hero.visible = true;
    }

    drawHubStations(this.cards, this.viewW, this.viewH, this.phase);

    this.subText.text = `AURÉLINE · LANCIÈRE SACRÉE\n${state.arenaTitle ?? 'CLOÎTRE EN RUINE'} · 6 ARÈNES\n\nTOUCHEZ POUR OUVRIR LA VEILLE`;
    this.subText.anchor.set(0.5, 1);
    this.subText.x = this.viewW / 2;
    this.subText.y = this.viewH - 73;
  }

  private drawInvocation(state: VeloriaScreenState): void {
    this.veil.rect(0, 0, this.viewW, this.viewH).fill({ color: 0x08050d, alpha: 0.72 });
    this.drawFrame();
    const cx = this.viewW / 2;
    const cy = this.viewH * 0.46;
    const pulse = 1 + Math.sin(this.phase * 4.4) * 0.045;
    for (let ring = 0; ring < 5; ring++) {
      const radius = (82 + ring * 44) * (ring % 2 ? 2 - pulse : pulse);
      this.ornaments.circle(cx, cy, radius).stroke({ color: ring % 2 ? 0x965ed0 : VELORIA_GACHA.gold, width: ring === 0 ? 5 : 2, alpha: 0.62 - ring * 0.08 });
    }
    for (let ray = 0; ray < 16; ray++) {
      const angle = ray * Math.PI * 2 / 16 + this.phase * (ray % 2 ? -0.18 : 0.23);
      this.ornaments.moveTo(cx + Math.cos(angle) * 95, cy + Math.sin(angle) * 95);
      this.ornaments.lineTo(cx + Math.cos(angle) * 238, cy + Math.sin(angle) * 238);
      this.ornaments.stroke({ color: ray % 2 ? VELORIA_GACHA.goldLight : 0x9d6ac8, width: ray % 3 === 0 ? 3 : 1, alpha: 0.32 });
    }
    this.ornaments.circle(cx, cy, 70 * pulse).fill({ color: 0xa36de0, alpha: 0.2 });

    if (state.heroTexture) {
      this.hero.texture = state.heroTexture;
      this.hero.width = 246;
      this.hero.height = 260;
      this.hero.anchor.set(0.5, 0.5);
      this.hero.x = cx;
      this.hero.y = cy + 25;
      this.hero.alpha = 0.65 + Math.sin(this.phase * 3) * 0.12;
      this.hero.visible = true;
    }

    this.titleText.text = 'INVOCATION SACRÉE';
    this.titleText.anchor.set(0.5, 0.5);
    this.titleText.x = cx;
    this.titleText.y = this.viewH * 0.18;
    this.subText.text = 'LA VEILLE RECONNAÎT VOTRE LAME\n\nTOUCHEZ POUR ENTRER DANS L’ARÈNE';
    this.subText.anchor.set(0.5, 0.5);
    this.subText.x = cx;
    this.subText.y = this.viewH * 0.79;
  }

  private drawBlessing(state: VeloriaScreenState): void {
    this.veil.rect(0, 0, this.viewW, this.viewH).fill({ color: 0x050309, alpha: 0.82 });
    this.drawFrame(0.72);
    this.titleText.text = 'CHOISISSEZ UNE BÉNÉDICTION';
    this.titleText.style.fontSize = 30;
    this.titleText.anchor.set(0.5, 0.5);
    this.titleText.x = this.viewW / 2;
    this.titleText.y = this.viewH * 0.26;
    this.subText.text = 'LA VEILLE SE FIGE · TOUCHEZ UNE CARTE';
    this.subText.anchor.set(0.5, 0.5);
    this.subText.x = this.viewW / 2;
    this.subText.y = this.viewH * 0.315;
    if (state.blessingPicks?.length) drawBlessingCards(this.cards, state.blessingPicks, this.viewW, this.viewH, this.phase);
  }

  private drawResult(state: VeloriaScreenState, victory: boolean): void {
    this.veil.rect(0, 0, this.viewW, this.viewH).fill({ color: victory ? 0x100b16 : 0x0b0508, alpha: 0.88 });
    this.drawFrame();
    const cx = this.viewW / 2;
    const cy = this.viewH * 0.39;
    for (let ring = 0; ring < 3; ring++) {
      this.ornaments.circle(cx, cy, 90 + ring * 42 + Math.sin(this.phase * 2 + ring) * 4);
      this.ornaments.stroke({ color: victory ? VELORIA_GACHA.gold : 0x8d3145, width: 3 - ring * 0.6, alpha: 0.5 - ring * 0.1 });
    }
    this.titleText.text = victory ? 'VEILLE ACCOMPLIE' : 'VEILLE ROMPUE';
    this.titleText.style.fill = victory ? VELORIA_GACHA.goldLight : 0xd76372;
    this.titleText.anchor.set(0.5, 0.5);
    this.titleText.x = cx;
    this.titleText.y = cy;
    this.subText.text = `${state.arenaTitle ?? ''}\nSCORE ${state.score ?? 0}\n\n${victory ? 'TOUCHEZ POUR REJOINDRE LE PAVILLON' : 'TOUCHEZ POUR RECOMMENCER · ÉCHAP : PAVILLON'}`;
    this.subText.anchor.set(0.5, 0.5);
    this.subText.x = cx;
    this.subText.y = this.viewH * 0.59;
  }

  dispose(): void {
    this.root.destroy({ children: true });
  }
}

function drawHubStations(container: Container, viewW: number, viewH: number, phase: number): void {
  const stations = [
    { icon: '♛', label: 'HÉROÏNES', x: viewW * 0.19, y: viewH * 0.38 },
    { icon: '✦', label: 'INVOCATION', x: viewW * 0.81, y: viewH * 0.38 },
    { icon: '⚒', label: 'ATELIER', x: viewW * 0.13, y: viewH * 0.57 },
    { icon: '◇', label: 'RELIQUES', x: viewW * 0.87, y: viewH * 0.57 },
    { icon: '☽', label: 'SERMENTS', x: viewW * 0.5, y: viewH * 0.73 },
  ];
  stations.forEach((station, index) => {
    const root = new Container();
    root.x = station.x;
    root.y = station.y + Math.sin(phase * 1.7 + index) * 3;
    const graphics = new Graphics();
    graphics.circle(0, 0, 43).fill({ color: 0x100b17, alpha: 0.9 });
    graphics.circle(0, 0, 43).stroke({ color: 0x6a5128, width: 5, alpha: 0.9 });
    graphics.circle(0, 0, 36).stroke({ color: VELORIA_GACHA.gold, width: 1.5, alpha: 0.9 });
    const icon = new Text({ text: station.icon, style: { fill: VELORIA_GACHA.goldLight, fontSize: 29, fontFamily: 'Georgia, serif', fontWeight: 'bold' } });
    icon.anchor.set(0.5, 0.5);
    const label = new Text({ text: station.label, style: { fill: 0xe9d8b0, fontSize: 10, fontFamily: 'Georgia, serif', fontWeight: 'bold', letterSpacing: 1 } });
    label.anchor.set(0.5, 0);
    label.y = 51;
    root.addChild(graphics, icon, label);
    container.addChild(root);
  });
}

function drawBlessingCards(
  container: Container,
  picks: { id: string; label: string; effect?: string; rarity?: string }[],
  viewW: number,
  viewH: number,
  phase: number,
): void {
  const cardW = 200;
  const cardH = 285;
  const gap = 16;
  const total = picks.length * cardW + (picks.length - 1) * gap;
  let cx = (viewW - total) / 2 + cardW / 2;
  picks.forEach((blessing, index) => {
    const y = viewH * 0.42 + Math.sin(phase * 2 + index * 0.8) * 3;
    const root = new Container();
    root.x = cx;
    root.y = y;
    const graphics = new Graphics();
    graphics.roundRect(-cardW / 2, 0, cardW, cardH, 12).fill({ color: index === 1 ? 0x203322 : index === 2 ? 0x1b2e42 : 0x342044, alpha: 0.96 });
    graphics.roundRect(-cardW / 2, 0, cardW, cardH, 12).stroke({ color: 0x6b5129, width: 6, alpha: 0.9 });
    graphics.roundRect(-cardW / 2 + 5, 5, cardW - 10, cardH - 10, 9).stroke({ color: VELORIA_GACHA.gold, width: 1.5, alpha: 0.92 });
    graphics.circle(0, 69, 38).stroke({ color: VELORIA_GACHA.goldLight, width: 2, alpha: 0.78 });
    graphics.moveTo(0, 37).lineTo(11, 64).lineTo(0, 98).lineTo(-11, 64).closePath().fill({ color: VELORIA_GACHA.goldLight, alpha: 0.82 });
    const label = new Text({
      text: blessing.label.toUpperCase(),
      style: { fill: VELORIA_GACHA.goldLight, fontSize: 15, fontWeight: 'bold', wordWrap: true, wordWrapWidth: cardW - 20, align: 'center', fontFamily: 'Georgia, serif', letterSpacing: 0.6 },
    });
    label.anchor.set(0.5, 0);
    label.y = 126;
    const effect = new Text({
      text: blessing.effect ?? '',
      style: { fill: 0xf2e8ff, fontSize: 12, lineHeight: 18, wordWrap: true, wordWrapWidth: cardW - 28, align: 'center', fontFamily: 'Georgia, serif' },
    });
    effect.anchor.set(0.5, 0);
    effect.y = 179;
    const key = new Text({ text: `${index + 1}`, style: { fill: 0x140d08, fontSize: 13, fontWeight: 'bold', fontFamily: 'Georgia, serif' } });
    const keyBg = new Graphics().circle(0, 0, 15).fill(VELORIA_GACHA.goldLight);
    key.anchor.set(0.5, 0.5);
    keyBg.x = key.x = cardW / 2 - 19;
    keyBg.y = key.y = 19;
    root.addChild(graphics, label, effect, keyBg, key);
    container.addChild(root);
    cx += cardW + gap;
  });
}

export async function loadTexture(url: string): Promise<Texture | null> {
  if (!url) return null;
  try { return await Assets.load<Texture>(url); }
  catch { return null; }
}
