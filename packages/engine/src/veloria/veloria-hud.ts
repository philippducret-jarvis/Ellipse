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
  ultimateCharge?: number;
  skillCooldownsMs?: readonly number[];
  guardCharges?: number;
  bossHp?: number;
  bossMaxHp?: number;
  bossPhase?: number;
  bossName?: string;
  visible: boolean;
}

export class VeloriaHudLayer {
  readonly root = new Container();
  private panel = new Graphics();
  private waveText = new Text({ text: '', style: { fill: VELORIA_GACHA.goldLight, fontSize: 18, fontFamily: 'Georgia, serif', fontWeight: 'bold', letterSpacing: 1.2 } });
  private timerText = new Text({ text: '', style: { fill: VELORIA_GACHA.goldLight, fontSize: 22, fontFamily: 'Georgia, serif', fontWeight: 'bold', letterSpacing: 1.5 } });
  private arenaText = new Text({ text: '', style: { fill: 0xf0d9a6, fontSize: 12, fontFamily: 'Georgia, serif', fontStyle: 'italic' } });
  private comboText = new Text({ text: '', style: { fill: VELORIA_GACHA.goldLight, fontSize: 32, fontFamily: 'Georgia, serif', fontWeight: 'bold', lineHeight: 29, dropShadow: { color: 0x000000, alpha: 0.9, blur: 7, distance: 2 } } });
  private hpBar = new Graphics();
  private hpLabel = new Text({ text: '', style: { fill: 0xffffff, fontSize: 14, fontFamily: 'Georgia, serif', fontWeight: 'bold' } });
  private bossBar = new Graphics();
  private bossLabel = new Text({ text: '', style: { fill: 0xf2d69a, fontSize: 13, fontFamily: 'Georgia, serif', fontWeight: 'bold' } });
  private overlay: Sprite | null = null;
  private skillGfx = new Graphics();
  private skillLabels = ['✦', '⚔', '◇', '☼'].map((key) => new Text({
    text: key,
    style: { fill: VELORIA_GACHA.goldLight, fontSize: 28, fontFamily: 'Georgia, serif', fontWeight: 'bold', dropShadow: { color: 0x000000, alpha: 0.85, blur: 5, distance: 1 } },
  }));
  private skillCooldownLabels = [0, 1, 2, 3].map(() => new Text({
    text: '',
    style: { fill: 0xffffff, fontSize: 11, fontFamily: 'Georgia, serif', fontWeight: 'bold' },
  }));
  private guardText = new Text({
    text: '',
    style: { fill: 0x9fc7ff, fontSize: 13, fontFamily: 'Georgia, serif', fontWeight: 'bold' },
  });
  private viewW = 720;
  private viewH = 1280;

  constructor(viewW: number, viewH: number) {
    this.viewW = viewW;
    this.viewH = viewH;
    this.root.zIndex = 900_000;
    this.root.addChild(
      this.panel,
      this.waveText,
      this.timerText,
      this.arenaText,
      this.comboText,
      this.hpBar,
      this.hpLabel,
      this.bossBar,
      this.bossLabel,
      this.skillGfx,
      ...this.skillLabels,
      ...this.skillCooldownLabels,
      this.guardText,
    );
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

    const pad = 14;
    const topH = 72;
    this.panel.clear();
    this.panel.roundRect(pad, 10, this.viewW - pad * 2, topH, 12);
    this.panel.fill({ color: VELORIA_GACHA.panel, alpha: 0.9 });
    this.panel.stroke({ color: 0x6d5526, width: 5, alpha: 0.75 });
    this.panel.roundRect(pad + 4, 14, this.viewW - pad * 2 - 8, topH - 8, 9);
    this.panel.stroke({ color: VELORIA_GACHA.gold, width: 1.5, alpha: 0.9 });
    this.panel.moveTo(this.viewW * 0.32, 18).lineTo(this.viewW * 0.32, 70).stroke({ color: VELORIA_GACHA.gold, width: 1, alpha: 0.28 });
    this.panel.moveTo(this.viewW * 0.68, 18).lineTo(this.viewW * 0.68, 70).stroke({ color: VELORIA_GACHA.gold, width: 1, alpha: 0.28 });
    this.panel.circle(this.viewW / 2 - 56, 43, 12).stroke({ color: VELORIA_GACHA.gold, width: 1.5, alpha: 0.85 });
    this.panel.moveTo(this.viewW / 2 - 56, 43).lineTo(this.viewW / 2 - 56, 35).stroke({ color: VELORIA_GACHA.goldLight, width: 1.5 });
    this.panel.moveTo(this.viewW / 2 - 56, 43).lineTo(this.viewW / 2 - 49, 48).stroke({ color: VELORIA_GACHA.goldLight, width: 1.5 });

    this.waveText.text = `VAGUE ${state.wave}/${state.totalWaves}`;
    this.waveText.x = pad + 22;
    this.waveText.y = 23;

    this.timerText.text = formatTime(state.timerSec);
    this.timerText.anchor.set(0.5, 0.5);
    this.timerText.x = this.viewW / 2 + 18;
    this.timerText.y = 43;

    this.arenaText.text = state.arenaTitle ?? '';
    this.arenaText.anchor.set(1, 0);
    this.arenaText.x = this.viewW - pad - 22;
    this.arenaText.y = 28;

    this.comboText.text = state.combo >= 2 ? `COMBO\n${state.combo}` : '';
    this.comboText.x = 28;
    this.comboText.y = state.bossHp != null ? 154 : 128;

    this.bossBar.clear();
    this.bossLabel.text = '';
    if (state.bossHp != null && state.bossMaxHp != null) {
      const bossW = this.viewW - 180;
      const bossX = 90;
      const bossY = 112;
      const ratio = Math.max(0, Math.min(1, state.bossHp / Math.max(1, state.bossMaxHp)));
      this.bossBar.roundRect(bossX, bossY, bossW, 18, 7);
      this.bossBar.fill({ color: 0x08060b, alpha: 0.88 });
      this.bossBar.stroke({ color: 0xc9a227, width: 1.5 });
      if (ratio > 0) {
        this.bossBar.roundRect(bossX + 2, bossY + 2, Math.max(4, (bossW - 4) * ratio), 14, 5);
        this.bossBar.fill({ color: 0x74233f, alpha: 0.96 });
      }
      this.bossLabel.text = `${state.bossName ?? 'BOURREAU DU CRÉPUSCULE'} · PHASE ${state.bossPhase ?? 1}`;
      this.bossLabel.anchor.set(0.5, 1);
      this.bossLabel.x = this.viewW / 2;
      this.bossLabel.y = bossY - 3;
    }

    const barW = this.viewW - 118;
    const barH = 34;
    const bx = 59;
    const by = this.viewH - 66;
    this.hpBar.clear();
    this.hpBar.moveTo(bx - 40, by + barH / 2).lineTo(bx - 13, by - 4).lineTo(bx + 3, by + barH / 2).lineTo(bx - 13, by + barH + 4).closePath();
    this.hpBar.fill({ color: 0x2a1720, alpha: 0.96 });
    this.hpBar.stroke({ color: VELORIA_GACHA.gold, width: 2 });
    this.hpBar.moveTo(bx + barW + 40, by + barH / 2).lineTo(bx + barW + 13, by - 4).lineTo(bx + barW - 3, by + barH / 2).lineTo(bx + barW + 13, by + barH + 4).closePath();
    this.hpBar.fill({ color: 0x2a1720, alpha: 0.96 });
    this.hpBar.stroke({ color: VELORIA_GACHA.gold, width: 2 });
    this.hpBar.roundRect(bx, by, barW, barH, 8);
    this.hpBar.fill({ color: 0x000000, alpha: 0.55 });
    this.hpBar.stroke({ color: VELORIA_GACHA.gold, width: 2 });
    const fillW = barW * Math.max(0, state.hp / Math.max(1, state.maxHp));
    if (fillW > 4) {
      this.hpBar.roundRect(bx + 2, by + 2, fillW - 4, barH - 4, 6);
      this.hpBar.fill({ color: VELORIA_GACHA.hpFill, alpha: 0.98 });
    }
    const displayMaxHp = 2000;
    const displayHp = Math.round(Math.max(0, state.hp / Math.max(1, state.maxHp)) * displayMaxHp);
    this.hpLabel.text = `PV ${displayHp} / ${displayMaxHp}`;
    this.hpLabel.anchor.set(0.5, 0.5);
    this.hpLabel.x = this.viewW / 2;
    this.hpLabel.y = by + barH / 2;

    this.skillGfx.clear();
    const baseX = this.viewW - 68;
    for (let i = 0; i < 4; i++) {
      const y = 450 + i * 112;
      const r = i === 3 ? 54 : 43;
      const cooldownMs = state.skillCooldownsMs?.[i] ?? 0;
      const ready = cooldownMs <= 0 && (i !== 3 || state.ultReady);
      this.skillGfx.circle(baseX, y, r + 7);
      this.skillGfx.fill({ color: 0x06040a, alpha: 0.82 });
      this.skillGfx.stroke({ color: 0x6b5127, width: 5, alpha: 0.88 });
      this.skillGfx.circle(baseX, y, r);
      this.skillGfx.fill({ color: ready ? (i === 3 ? 0x6f4d18 : i === 2 ? 0x183855 : 0x3b2057) : 0x07060a, alpha: ready ? 0.9 : 0.86 });
      this.skillGfx.stroke({ color: ready ? VELORIA_GACHA.goldLight : 0x6a604f, width: i === 3 ? 3.5 : 2 });
      this.skillGfx.circle(baseX + r * 0.72, y - r * 0.72, 13);
      this.skillGfx.fill({ color: 0x09060d, alpha: 0.96 });
      this.skillGfx.stroke({ color: VELORIA_GACHA.gold, width: 1.5 });

      const label = this.skillLabels[i];
      label.anchor.set(0.5, 0.5);
      label.x = baseX;
      label.y = y;
      label.alpha = ready ? 1 : 0.48;

      const cooldown = this.skillCooldownLabels[i];
      cooldown.text = cooldownMs > 0
        ? (cooldownMs / 1000).toFixed(1)
        : i === 3 && !state.ultReady
          ? `${Math.floor(state.ultimateCharge ?? 0)}%`
          : `${i + 1}`;
      cooldown.anchor.set(0.5, 0.5);
      cooldown.x = cooldownMs > 0 || (i === 3 && !state.ultReady) ? baseX : baseX + r * 0.72;
      cooldown.y = cooldownMs > 0 || (i === 3 && !state.ultReady) ? y + r + 15 : y - r * 0.72;
    }

    this.guardText.text = (state.guardCharges ?? 0) > 0 ? `GARDE ×${state.guardCharges}` : '';
    this.guardText.anchor.set(1, 0.5);
    this.guardText.x = this.viewW - 24;
    this.guardText.y = this.viewH - 108;
  }

  dispose(): void {
    this.root.destroy({ children: true });
  }
}
