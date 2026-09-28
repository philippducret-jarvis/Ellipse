import { Container, Graphics, Text } from 'pixi.js';
import type { SimWorld } from '../sim/world.js';

const GOLD = 0xf3c76b;
const GOLD_LIGHT = 0xffedb4;
const VIOLET = 0x9f72ff;
const CYAN = 0x74d9ff;

/** Couche de mouvement procédurale : attaques, aura, poussière et feedback. */
export class VeloriaCombatFxLayer {
  readonly root = new Container();
  private graphics = new Graphics();
  private banner = new Text({
    text: '',
    style: {
      fill: GOLD_LIGHT,
      fontSize: 21,
      fontFamily: 'Georgia, serif',
      fontWeight: 'bold',
      letterSpacing: 2,
      dropShadow: { color: 0x000000, alpha: 0.9, blur: 8, distance: 2 },
    },
  });
  private time = 0;
  private abilityTimer = 0;
  private abilitySlot = 0;

  constructor(private readonly viewW: number, private readonly viewH: number) {
    this.root.zIndex = 760_000;
    this.banner.anchor.set(0.5, 0.5);
    this.banner.x = viewW / 2;
    this.banner.y = viewH * 0.63;
    this.root.addChild(this.graphics, this.banner);
  }

  triggerAbility(slot: number): void {
    this.abilitySlot = Math.max(0, Math.min(3, Math.floor(slot)));
    this.abilityTimer = this.abilitySlot === 3 ? 1.25 : 0.72;
    this.banner.text = ['ESTOC CÉLESTE', 'ARC LUNAIRE', 'GARDE DE L’AUBE', 'AURORE SACRÉE'][this.abilitySlot] ?? '';
  }

  update(world: SimWorld | null, dtSec: number, visible: boolean): void {
    this.root.visible = visible && !!world?.veloria;
    if (!this.root.visible || !world?.veloria) return;
    this.time += Math.max(0, Math.min(dtSec, 0.05));
    this.abilityTimer = Math.max(0, this.abilityTimer - dtSec);
    const graphics = this.graphics;
    graphics.clear();

    const player = world.player;
    const veloria = world.veloria;
    const px = player.x + player.width / 2;
    const feetY = player.y + player.height;
    const bodyY = feetY - 120;

    this.drawAtmosphere(graphics, veloria.laneCenters, px, feetY);

    const charge = Math.max(0, Math.min(1, veloria.ultimateCharge / 100));
    if (charge > 0.04) {
      const pulse = 1 + Math.sin(this.time * 4.8) * 0.07;
      graphics.circle(px, bodyY, 68 * pulse).stroke({ color: charge >= 1 ? GOLD : VIOLET, width: 2.5, alpha: 0.16 + charge * 0.22 });
      graphics.circle(px, bodyY, 82 * pulse).stroke({ color: charge >= 1 ? GOLD_LIGHT : CYAN, width: 1, alpha: 0.09 + charge * 0.13 });
    }

    if (veloria.guardCharges > 0 || player.invincibleMs > 500) this.drawShield(graphics, px, bodyY, veloria.guardCharges > 0 ? 0.62 : 0.32);
    if (veloria.echoZoneTimerMs > 0) this.drawEchoZone(graphics, veloria.laneCenters[veloria.echoZoneLaneIndex] ?? px, feetY);
    if (veloria.attackCooldown > 0.07) this.drawAutoAttack(graphics, world, px, bodyY, feetY);
    if (this.abilityTimer > 0) this.drawAbility(graphics, world, px, bodyY, feetY);

    if (player.invincibleMs > 0 && Math.floor(player.invincibleMs / 100) % 2 === 0) {
      graphics.rect(3, 3, this.viewW - 6, this.viewH - 6).stroke({ color: 0xcb3651, width: 12, alpha: 0.18 });
    }

    this.banner.visible = this.abilityTimer > 0.28;
    this.banner.alpha = Math.min(1, this.abilityTimer * 2.4);
    this.banner.scale.set(1 + Math.max(0, 0.55 - this.abilityTimer) * 0.08);
  }

  private drawAtmosphere(graphics: Graphics, lanes: number[], px: number, feetY: number): void {
    const horizonY = 215;
    for (const laneX of lanes) {
      graphics.moveTo(this.viewW / 2 + (laneX - this.viewW / 2) * 0.24, horizonY);
      graphics.lineTo(laneX, feetY + 36);
      graphics.stroke({ color: GOLD, width: 1.2, alpha: 0.12 });
    }
    graphics.ellipse(px, feetY + 6, 84, 17).fill({ color: 0x05030a, alpha: 0.46 });
    graphics.ellipse(px, feetY + 3, 66, 10).stroke({ color: GOLD, width: 1.3, alpha: 0.2 });

    for (let index = 0; index < 18; index++) {
      const seed = index * 19.137;
      const x = (seed * 43 + Math.sin(this.time * (0.18 + index * 0.008) + seed) * 46) % this.viewW;
      const normalizedX = x < 0 ? x + this.viewW : x;
      const y = ((seed * 71 - this.time * (12 + index % 5) + this.viewH * 4) % this.viewH);
      const alpha = 0.08 + (index % 4) * 0.025;
      graphics.circle(normalizedX, y, index % 3 === 0 ? 2 : 1.15).fill({ color: index % 4 === 0 ? GOLD_LIGHT : 0xb9c4df, alpha });
    }
  }

  private drawAutoAttack(graphics: Graphics, world: SimWorld, px: number, bodyY: number, feetY: number): void {
    const cooldown = world.veloria?.attackCooldown ?? 0;
    const progress = Math.max(0, Math.min(1, 1 - cooldown / 0.4));
    const facing = world.player.facing || 1;
    const start = facing > 0 ? -1.35 : Math.PI - 1.35;
    const end = facing > 0 ? 1.05 : Math.PI + 1.05;
    const radius = 115 + progress * 22;
    graphics.arc(px, bodyY, radius, start, start + (end - start) * Math.min(1, progress * 1.8));
    graphics.stroke({ color: GOLD_LIGHT, width: 12 - progress * 5, alpha: 0.74 * (1 - progress * 0.45) });
    graphics.arc(px, bodyY, radius + 10, start, start + (end - start) * Math.min(1, progress * 1.55));
    graphics.stroke({ color: GOLD, width: 3, alpha: 0.88 * (1 - progress) });

    const target = world.enemies
      .filter((enemy) => enemy.alive && Math.abs(enemy.x + enemy.width / 2 - px) < 90)
      .sort((a, b) => b.y - a.y)[0];
    if (target) {
      const tx = target.x + target.width / 2;
      const ty = target.y + target.height / 2;
      const spark = Math.max(0, 1 - progress * 1.4);
      for (let ray = 0; ray < 7; ray++) {
        const angle = ray * Math.PI * 2 / 7 + this.time;
        graphics.moveTo(tx, ty);
        graphics.lineTo(tx + Math.cos(angle) * (18 + ray * 2) * spark, ty + Math.sin(angle) * (18 + ray * 2) * spark);
        graphics.stroke({ color: ray % 2 ? GOLD_LIGHT : 0xffffff, width: 2.5, alpha: spark });
      }
      graphics.circle(tx, ty, 7 + spark * 12).fill({ color: GOLD_LIGHT, alpha: 0.35 * spark });
    }

    if (progress < 0.45) {
      graphics.moveTo(px, feetY - 22);
      graphics.lineTo(px - facing * 34, feetY + 4);
      graphics.stroke({ color: GOLD, width: 4, alpha: 0.42 });
    }
  }

  private drawShield(graphics: Graphics, x: number, y: number, alpha: number): void {
    const pulse = 1 + Math.sin(this.time * 5) * 0.035;
    graphics.ellipse(x, y, 84 * pulse, 126 * pulse).fill({ color: CYAN, alpha: alpha * 0.07 });
    graphics.ellipse(x, y, 84 * pulse, 126 * pulse).stroke({ color: CYAN, width: 4, alpha });
    graphics.arc(x, y, 91 * pulse, -2.5, -0.65).stroke({ color: GOLD_LIGHT, width: 2, alpha: alpha * 0.85 });
  }

  private drawEchoZone(graphics: Graphics, x: number, feetY: number): void {
    const pulse = 1 + Math.sin(this.time * 4.2) * 0.08;
    graphics.ellipse(x, feetY + 4, 104 * pulse, 31 * pulse).fill({ color: VIOLET, alpha: 0.12 });
    graphics.ellipse(x, feetY + 4, 104 * pulse, 31 * pulse).stroke({ color: VIOLET, width: 3, alpha: 0.52 });
    graphics.ellipse(x, feetY + 4, 72 / pulse, 20 / pulse).stroke({ color: CYAN, width: 1.5, alpha: 0.36 });
  }

  private drawAbility(graphics: Graphics, world: SimWorld, px: number, bodyY: number, feetY: number): void {
    const life = Math.max(0, Math.min(1, this.abilityTimer / (this.abilitySlot === 3 ? 1.25 : 0.72)));
    const burst = 1 - life;
    if (this.abilitySlot === 0) {
      graphics.moveTo(px, feetY - 30);
      graphics.lineTo(px, 180 + burst * 120);
      graphics.stroke({ color: GOLD_LIGHT, width: 18 * life + 3, alpha: 0.68 * life });
      graphics.moveTo(px, feetY - 30);
      graphics.lineTo(px, 170 + burst * 120);
      graphics.stroke({ color: 0xffffff, width: 4, alpha: 0.92 * life });
    } else if (this.abilitySlot === 1) {
      for (let ring = 0; ring < 3; ring++) {
        const radius = 80 + burst * 260 + ring * 24;
        graphics.arc(px, bodyY, radius, -2.85 + ring * 0.15, 0.45 + ring * 0.12);
        graphics.stroke({ color: ring === 1 ? CYAN : VIOLET, width: 8 - ring * 2, alpha: life * (0.5 - ring * 0.08) });
      }
    } else if (this.abilitySlot === 2) {
      this.drawShield(graphics, px, bodyY, Math.min(1, life * 1.6));
      for (let ray = 0; ray < 8; ray++) {
        const angle = ray * Math.PI / 4 + this.time;
        graphics.moveTo(px + Math.cos(angle) * 88, bodyY + Math.sin(angle) * 125);
        graphics.lineTo(px + Math.cos(angle) * 116, bodyY + Math.sin(angle) * 158);
        graphics.stroke({ color: CYAN, width: 2, alpha: life * 0.7 });
      }
    } else {
      const radius = 90 + burst * this.viewW * 0.76;
      graphics.circle(px, bodyY, radius).fill({ color: GOLD_LIGHT, alpha: life * 0.12 });
      graphics.circle(px, bodyY, radius).stroke({ color: GOLD_LIGHT, width: 16 * life + 2, alpha: life * 0.7 });
      graphics.circle(px, bodyY, radius * 0.72).stroke({ color: VIOLET, width: 5, alpha: life * 0.58 });
      for (let ray = 0; ray < 14; ray++) {
        const angle = ray * Math.PI * 2 / 14 + this.time * 0.35;
        graphics.moveTo(px + Math.cos(angle) * radius * 0.2, bodyY + Math.sin(angle) * radius * 0.2);
        graphics.lineTo(px + Math.cos(angle) * radius, bodyY + Math.sin(angle) * radius);
        graphics.stroke({ color: ray % 2 ? GOLD : 0xffffff, width: ray % 2 ? 3 : 1.5, alpha: life * 0.62 });
      }
      if (life > 0.72) graphics.rect(0, 0, this.viewW, this.viewH).fill({ color: 0xffffff, alpha: (life - 0.72) * 0.32 });
    }

    for (const enemy of world.enemies) {
      if (!enemy.alive) continue;
      const ex = enemy.x + enemy.width / 2;
      const ey = enemy.y + enemy.height / 2;
      graphics.circle(ex, ey, 14 + burst * 26).stroke({ color: this.abilitySlot === 1 ? VIOLET : GOLD, width: 3, alpha: life * 0.55 });
    }
  }

  dispose(): void {
    this.root.destroy({ children: true });
  }
}
