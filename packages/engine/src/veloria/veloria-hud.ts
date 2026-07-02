/**
 * HUD combat Veloria — Pixi overlay fixe (parité gacha-renderer drawTopHud / drawHpBar).
 */
import { Assets, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { VELORIA_GACHA, formatTime } from './veloria-style.js';

export interface VeloriaHudState {
  wave: number;
  totalWaves: number;
  timerSec: number;
  arenaTitle?: string;
  hp: number;
  maxHp: number;
  combo: number;
  ultReady?: boolean;
  visible: boolean;
}

export class VeloriaHudLayer {
  readonly root = new Container();
  private panel = new Graphics();
  private waveText = new Text({ text: '', style: { fill: VELORIA_GACHA.goldLight, fontSize: 15, fontFamily: 'Georgia, serif', fontWeight: 'bold' } });
  private timerText = new Text({ text: '', style: { fill: VELORIA_GACHA.goldLight, fontSize: 15, fontFamily: 'Georgia, serif', fontWeight: 'bold' } });
  private arenaText = new Text({ text: '', style: { fill: 0xf0d9a6, fontSize: 12, fontFamily: 'Georgia, serif', fontStyle: 'italic' } });
  private comboText = new Text({ text: '', style: { fill: VELORIA_GACHA.gold, fontSize: 22, fontFamily: 'Georgia, serif', fontWeight: 'bold' } });
  private hpBar = new Graphics();
  private hpLabel = new Text({ text: '', style: { fill: 0xffffff, fontSize: 14, fontFamily: 'Georgia, serif', fontWeight: 'bold' } });
  private overlay: Sprite | null = null;
  private skillGfx = new Graphics();
  private viewW = 720;
  private viewH = 1280;

  constructor(viewW: number, viewH: number) {
    this.viewW = viewW;
    this.viewH = viewH;
    this.root.zIndex = 900_000;
    this.root.addChild(this.panel, this.waveText, this.timerText, this.arenaText, this.comboText, this.hpBar, this.hpLabel, this.skillGfx);
  }

  async loadOverlay(url?: string): Promise<void> {
    if (!url) return;
    try {
      const tex = await Assets.load<Texture>(url);
      this.overlay = new Sprite(tex);
      this.overlay.width = this.viewW;
      this.overlay.height = this.viewH;
      this.overlay.alpha = 0.85;
      this.root.addChildAt(this.overlay, 0);
    } catch {
      /* overlay optionnel */
    }
  }

  update(state: VeloriaHudState): void {
    this.root.visible = state.visible;
    if (!state.visible) return;

    const pad = 16;
    const topH = 52;
    this.panel.clear();
    this.panel.roundRect(pad, 12, this.viewW - pad * 2, topH, 10);
    this.panel.fill({ color: VELORIA_GACHA.panel, alpha: 0.88 });
    this.panel.stroke({ color: VELORIA_GACHA.gold, width: 1.5 });

    this.waveText.text = `VAGUE ${state.wave}/${state.totalWaves}`;
    this.waveText.x = pad + 16;
    this.waveText.y = 28;

    this.timerText.text = formatTime(state.timerSec);
    this.timerText.anchor.set(0.5, 0.5);
    this.timerText.x = this.viewW / 2;
    this.timerText.y = 28;

    this.arenaText.text = state.arenaTitle ?? '';
    this.arenaText.x = pad + 16;
    this.arenaText.y = 48;

    this.comboText.text = state.combo >= 2 ? `COMBO ${state.combo}` : '';
    this.comboText.x = 28;
    this.comboText.y = 88;

    const barW = this.viewW - 48;
    const barH = 28;
    const bx = 24;
    const by = this.viewH - 72;
    this.hpBar.clear();
    this.hpBar.roundRect(bx, by, barW, barH, 8);
    this.hpBar.fill({ color: 0x000000, alpha: 0.55 });
    this.hpBar.stroke({ color: VELORIA_GACHA.gold, width: 2 });
    const fillW = barW * Math.max(0, state.hp / state.maxHp);
    if (fillW > 4) {
      this.hpBar.roundRect(bx + 2, by + 2, fillW - 4, barH - 4, 6);
      this.hpBar.fill(VELORIA_GACHA.hpFill);
    }
    this.hpLabel.text = `♥ PV ${Math.ceil(state.hp)} / ${state.maxHp}`;
    this.hpLabel.anchor.set(0.5, 0.5);
    this.hpLabel.x = this.viewW / 2;
    this.hpLabel.y = by + barH / 2;

    this.skillGfx.clear();
    const baseX = this.viewW - 88;
    const labels = ['⚔', '🗡', '🛡', '✦'];
    for (let i = 0; i < 4; i++) {
      const y = 180 + i * 72;
      const r = i === 3 ? 34 : 28;
      this.skillGfx.circle(baseX, y, r);
      this.skillGfx.fill({ color: i === 3 && state.ultReady ? 0xc9a227 : 0x07060a, alpha: i === 3 && state.ultReady ? 0.35 : 0.75 });
      this.skillGfx.stroke({ color: VELORIA_GACHA.gold, width: i === 3 ? 2.5 : 1.5 });
    }
  }

  dispose(): void {
    this.root.destroy({ children: true });
  }
}
