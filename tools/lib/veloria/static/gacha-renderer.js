/**
 * Rendu GACHA HD — HUD, arènes plein écran, sprites combat, écrans bénédiction.
 * Calqué sur les mockups concept Veloria (portrait 720×1280).
 */
export const GACHA_STYLE = {
  gold: '#c9a227',
  goldLight: '#f0d9a6',
  violet: '#5a3a72',
  bg: '#07060a',
  hp: '#c0392b',
  hpFill: '#e74c3c',
  skillBg: 'rgba(7,6,10,0.75)',
  panel: 'rgba(7,6,10,0.88)',
};

export function createGachaRenderer(ctx, layout, options = {}) {
  const { hudOverlay = null, integratedArena = null, depthSpec = null } = options;
  const W = layout.width ?? 720;
  const H = layout.height ?? 1280;
  const HORIZON_Y = depthSpec?.horizon_y ?? 110;
  const GROUND_Y = depthSpec?.ground_y ?? layout.ground_y ?? 973;
  const SCALE_MIN = depthSpec?.scale_range?.[0] ?? 0.5;
  const SCALE_MAX = depthSpec?.scale_range?.[1] ?? 1.12;

  function depthAt(y) {
    const span = GROUND_Y - HORIZON_Y;
    if (span <= 0) return 0.5;
    return Math.max(0, Math.min(1, (y - HORIZON_Y) / span));
  }

  function scaleAt(y) {
    const d = depthAt(y);
    return SCALE_MIN + (SCALE_MAX - SCALE_MIN) * d;
  }

  function feetY(entityY, height) {
    return entityY + height * (depthSpec?.feet_offset ?? 0.92);
  }

  function drawGroundShadow(cx, groundY, scale) {
    ctx.fillStyle = `rgba(0,0,0,${0.22 + depthAt(groundY) * 0.2})`;
    ctx.beginPath();
    ctx.ellipse(cx, groundY, 28 * scale, 8 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawArenaBackground(bgImg, alpha = 1) {
    ctx.fillStyle = '#0a0810';
    ctx.fillRect(0, 0, W, H);
    if (bgImg) {
      ctx.globalAlpha = alpha;
      ctx.drawImage(bgImg, 0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(7,6,10,0.08)');
    g.addColorStop(0.55, 'rgba(7,6,10,0.02)');
    g.addColorStop(1, 'rgba(7,6,10,0.45)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function drawLaneGuides(laneMeta, groundY, pulse = 0) {
    for (const lane of laneMeta?.lanes ?? []) {
      const cx = lane.center_x;
      ctx.strokeStyle = `rgba(201,162,39,${0.12 + pulse * 0.08})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, 140);
      ctx.lineTo(cx, groundY);
      ctx.stroke();
      ctx.fillStyle = `rgba(201,162,39,${0.04 + pulse * 0.03})`;
      ctx.fillRect(cx - 90, 140, 180, groundY - 140);
    }
  }

  function drawTopHud(state) {
    const { wave, totalWaves, timerSec, arenaTitle } = state;
    roundRect(16, 12, W - 32, 52, 10);
    ctx.fillStyle = GACHA_STYLE.panel;
    ctx.fill();
    ctx.strokeStyle = GACHA_STYLE.gold;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = GACHA_STYLE.goldLight;
    ctx.font = 'bold 15px Georgia, serif';
    ctx.fillText(`VAGUE ${wave}/${totalWaves}`, 32, 38);
    ctx.textAlign = 'center';
    ctx.fillText(formatTime(timerSec), W / 2, 38);
    ctx.textAlign = 'right';
    ctx.font = '13px Georgia, serif';
    ctx.fillStyle = GACHA_STYLE.gold;
    ctx.fillText('⏸', W - 36, 38);
    ctx.textAlign = 'left';

    if (arenaTitle) {
      ctx.font = 'italic 12px Georgia, serif';
      ctx.fillStyle = 'rgba(240,217,166,0.7)';
      ctx.fillText(arenaTitle, 32, 58);
    }
  }

  function drawCombo(combo) {
    if (combo < 2) return;
    ctx.save();
    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillStyle = GACHA_STYLE.gold;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText(`COMBO ${combo}`, 28, 100);
    ctx.fillText(`COMBO ${combo}`, 28, 100);
    ctx.restore();
  }

  function drawSkillBar(skills, ultReady) {
    const baseX = W - 88;
    const labels = ['⚔', '🗡', '🛡', '✦'];
    for (let i = 0; i < 4; i++) {
      const y = 180 + i * 72;
      const r = i === 3 ? 34 : 28;
      ctx.beginPath();
      ctx.arc(baseX, y, r, 0, Math.PI * 2);
      ctx.fillStyle = i === 3 && ultReady ? 'rgba(201,162,39,0.35)' : GACHA_STYLE.skillBg;
      ctx.fill();
      ctx.strokeStyle = GACHA_STYLE.gold;
      ctx.lineWidth = i === 3 ? 2.5 : 1.5;
      ctx.stroke();
      ctx.font = `${i === 3 ? 18 : 16}px serif`;
      ctx.fillStyle = GACHA_STYLE.goldLight;
      ctx.textAlign = 'center';
      ctx.fillText(labels[i], baseX, y + 6);
      if (i === 3) {
        ctx.font = '8px Georgia';
        ctx.fillText('ULTIME', baseX, y + r + 12);
      }
    }
    ctx.textAlign = 'left';
  }

  function drawHpBar(hp, maxHp) {
    const barW = W - 48;
    const barH = 28;
    const x = 24;
    const y = H - 72;
    roundRect(x, y, barW, barH, 8);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fill();
    ctx.strokeStyle = GACHA_STYLE.gold;
    ctx.lineWidth = 2;
    ctx.stroke();
    const fillW = barW * Math.max(0, hp / maxHp);
    if (fillW > 0) {
      roundRect(x + 2, y + 2, fillW - 4, barH - 4, 6);
      ctx.fillStyle = GACHA_STYLE.hpFill;
      ctx.fill();
    }
    ctx.font = 'bold 14px Georgia, serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(`♥ PV ${Math.ceil(hp)} / ${maxHp}`, W / 2, y + 19);
    ctx.textAlign = 'left';
  }

  function drawSprite(img, x, y, w, h, fallback, glow = false) {
    if (glow) {
      ctx.shadowColor = 'rgba(201,162,39,0.65)';
      ctx.shadowBlur = 28;
    }
    if (img) {
      ctx.save();
      if (glow) ctx.filter = 'brightness(1.15) contrast(1.08)';
      ctx.drawImage(img, x - w / 2, y - h, w, h);
      ctx.restore();
    } else {
      ctx.fillStyle = fallback;
      ctx.fillRect(x - w / 2, y - h, w, h);
    }
    ctx.shadowBlur = 0;
  }

  function drawAttackArc(x, y, r, alpha) {
    ctx.strokeStyle = `rgba(94,199,239,${alpha})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, r, -Math.PI * 0.85, -Math.PI * 0.15);
    ctx.stroke();
    ctx.fillStyle = `rgba(201,162,39,${alpha * 0.25})`;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBlessingScreen(picks, onPickHint = '[1] [2] [3]') {
    ctx.fillStyle = 'rgba(7,6,10,0.82)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.fillStyle = GACHA_STYLE.gold;
    ctx.fillText('CHOISISSEZ UNE BÉNÉDICTION', W / 2, H * 0.28);
    ctx.font = '13px Georgia';
    ctx.fillStyle = GACHA_STYLE.goldLight;
    ctx.fillText(onPickHint, W / 2, H * 0.32);

    const cardW = 200;
    const cardH = 260;
    const gap = 16;
    const total = picks.length * cardW + (picks.length - 1) * gap;
    let cx = (W - total) / 2 + cardW / 2;

    for (let i = 0; i < picks.length; i++) {
      const b = picks[i];
      const x = cx - cardW / 2;
      const y = H * 0.36;
      roundRect(x, y, cardW, cardH, 12);
      const g = ctx.createLinearGradient(x, y, x, y + cardH);
      g.addColorStop(0, 'rgba(90,58,114,0.9)');
      g.addColorStop(1, 'rgba(7,6,10,0.95)');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = GACHA_STYLE.gold;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.font = 'bold 11px Georgia';
      ctx.fillStyle = GACHA_STYLE.gold;
      ctx.fillText(`[${i + 1}]`, cx, y + 28);
      ctx.font = 'bold 16px Georgia';
      ctx.fillStyle = '#fff';
      const title = (b.label ?? b.id ?? '').slice(0, 22);
      ctx.fillText(title, cx, y + 120);
      ctx.font = '12px Georgia';
      ctx.fillStyle = GACHA_STYLE.goldLight;
      ctx.fillText(b.rarity ?? 'Héroïque', cx, y + 148);
      ctx.font = '11px Georgia';
      ctx.fillStyle = 'rgba(240,217,166,0.75)';
      const desc = (b.effect ?? b.description ?? '+ bonus').slice(0, 40);
      ctx.fillText(desc, cx, y + 175);
      cx += cardW + gap;
    }
    ctx.textAlign = 'left';
  }

  function drawWaveBanner(text) {
    ctx.fillStyle = 'rgba(201,162,39,0.2)';
    ctx.fillRect(0, H * 0.42, W, 48);
    ctx.font = 'bold 18px Georgia, serif';
    ctx.fillStyle = GACHA_STYLE.goldLight;
    ctx.textAlign = 'center';
    ctx.fillText(text, W / 2, H * 0.42 + 30);
    ctx.textAlign = 'left';
  }

  function drawOverlayMessage(title, subtitle) {
    ctx.fillStyle = 'rgba(7,6,10,0.75)';
    ctx.fillRect(0, H * 0.4, W, H * 0.2);
    ctx.textAlign = 'center';
    ctx.font = 'bold 24px Georgia, serif';
    ctx.fillStyle = GACHA_STYLE.gold;
    ctx.fillText(title, W / 2, H * 0.48);
    if (subtitle) {
      ctx.font = '14px Georgia';
      ctx.fillStyle = GACHA_STYLE.goldLight;
      ctx.fillText(subtitle, W / 2, H * 0.52);
    }
    ctx.textAlign = 'left';
  }

  function drawVictoryScreen(score, arenaTitle) {
    ctx.fillStyle = 'rgba(7,6,10,0.88)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.font = 'bold 28px Georgia, serif';
    ctx.fillStyle = GACHA_STYLE.gold;
    ctx.fillText('VEILLE ACCOMPLIE', W / 2, H * 0.38);
    ctx.font = '16px Georgia';
    ctx.fillStyle = GACHA_STYLE.goldLight;
    ctx.fillText(arenaTitle ?? 'Arène terminée', W / 2, H * 0.44);
    ctx.font = 'bold 20px Georgia';
    ctx.fillText(`Score ${score}`, W / 2, H * 0.5);
    ctx.font = '13px Georgia';
    ctx.fillStyle = 'rgba(240,217,166,0.75)';
    ctx.fillText('[Entrée] Hub · [1-6] Autre arène', W / 2, H * 0.58);
    ctx.textAlign = 'left';
  }

  function drawGameOverScreen(score) {
    ctx.fillStyle = 'rgba(7,6,10,0.9)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.font = 'bold 26px Georgia, serif';
    ctx.fillStyle = '#a04040';
    ctx.fillText('VEILLE ROMPUE', W / 2, H * 0.4);
    ctx.font = '15px Georgia';
    ctx.fillStyle = GACHA_STYLE.goldLight;
    ctx.fillText(`Score ${score}`, W / 2, H * 0.46);
    ctx.font = '13px Georgia';
    ctx.fillText('[Entrée] Réessayer · [1-6] Changer d arène', W / 2, H * 0.54);
    ctx.textAlign = 'left';
  }

  function drawHubScreen(state) {
    const { title, heroImg, arenas, bgImg } = state;
    drawArenaBackground(bgImg ?? null, 1);
    const g = ctx.createRadialGradient(W / 2, H * 0.35, 40, W / 2, H * 0.35, W * 0.7);
    g.addColorStop(0, 'rgba(90,58,114,0.45)');
    g.addColorStop(1, 'rgba(7,6,10,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    if (heroImg) drawSprite(heroImg, W / 2, H * 0.48, 260, 340, GACHA_STYLE.gold, true);

    ctx.textAlign = 'center';
    ctx.font = 'bold 11px Georgia';
    ctx.fillStyle = GACHA_STYLE.gold;
    ctx.fillText('VELORIA · VEILLE DES LAMES', W / 2, H * 0.12);
    ctx.font = 'bold 26px Georgia, serif';
    ctx.fillStyle = GACHA_STYLE.goldLight;
    ctx.fillText(title ?? 'La Veille des Lames', W / 2, H * 0.17);

    roundRect(W / 2 - 140, H * 0.62, 280, 52, 12);
    ctx.fillStyle = 'rgba(201,162,39,0.18)';
    ctx.fill();
    ctx.strokeStyle = GACHA_STYLE.gold;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = 'bold 16px Georgia';
    ctx.fillStyle = GACHA_STYLE.goldLight;
    ctx.fillText('COMMENCER LA VEILLE', W / 2, H * 0.62 + 32);

    ctx.font = '12px Georgia';
    ctx.fillStyle = 'rgba(240,217,166,0.65)';
    ctx.fillText('[Entrée] Lancer · [1-6] Arène directe', W / 2, H * 0.72);

    const cardW = 100;
    const gap = 10;
    const total = (arenas?.length ?? 6) * cardW + 5 * gap;
    let cx = (W - total) / 2 + cardW / 2;
    for (let i = 0; i < (arenas?.length ?? 6); i++) {
      const x = cx - cardW / 2;
      const y = H * 0.78;
      roundRect(x, y, cardW, 56, 8);
      ctx.fillStyle = 'rgba(90,58,114,0.55)';
      ctx.fill();
      ctx.strokeStyle = GACHA_STYLE.gold;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.font = 'bold 11px Georgia';
      ctx.fillStyle = GACHA_STYLE.goldLight;
      ctx.fillText(`[${i + 1}]`, cx, y + 22);
      ctx.font = '9px Georgia';
      ctx.fillText((arenas?.[i]?.title ?? `Arène ${i + 1}`).slice(0, 12), cx, y + 40);
      cx += cardW + gap;
    }
    ctx.textAlign = 'left';
  }

  function drawInvokeScreen(pullCount) {
    ctx.fillStyle = 'rgba(7,6,10,0.92)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillStyle = GACHA_STYLE.gold;
    ctx.fillText('INVOCATION SACRÉE', W / 2, H * 0.35);
    for (let i = 0; i < 3; i++) {
      const x = W / 2 - 110 + i * 110;
      const y = H * 0.42;
      roundRect(x, y, 90, 120, 10);
      const g = ctx.createLinearGradient(x, y, x, y + 120);
      g.addColorStop(0, 'rgba(201,162,39,0.35)');
      g.addColorStop(1, 'rgba(90,58,114,0.8)');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = GACHA_STYLE.gold;
      ctx.stroke();
      ctx.font = '28px serif';
      ctx.fillStyle = GACHA_STYLE.goldLight;
      ctx.fillText('✦', x + 45, y + 70);
    }
    ctx.font = '13px Georgia';
    ctx.fillStyle = GACHA_STYLE.goldLight;
    ctx.fillText(`Tirage ${pullCount}/1 · [Entrée] Continuer`, W / 2, H * 0.68);
    ctx.textAlign = 'left';
  }

  return {
    drawHubScreen,
    drawInvokeScreen,
    drawVictoryScreen,
    drawGameOverScreen,
    drawFrame(state) {
      const {
        bgImg,
        laneMeta,
        groundY,
        player,
        heroImg,
        enemies,
        attacks,
        hazard,
        hazardPulse,
        hud,
        blessingPicks,
        banner,
        overlay,
      } = state;

      drawArenaBackground(bgImg, 1);
      drawLaneGuides(laneMeta, groundY, hazardPulse ?? 0);
      if (hazard?.render) hazard.render(ctx, layout, hazardPulse ?? 0);

      for (const atk of attacks ?? []) drawAttackArc(atk.x, atk.y, atk.r, Math.min(1, atk.life * 2));

      const sortedEnemies = [...(enemies ?? [])]
        .filter((e) => e.alive)
        .sort((a, b) => feetY(a.y, a.h) - feetY(b.y, b.h));

      for (const enemy of sortedEnemies) {
        const sc = scaleAt(enemy.y + enemy.h);
        const drawW = enemy.w * 1.8 * sc;
        const drawH = enemy.h * 1.8 * sc;
        const cx = enemy.x + enemy.w / 2;
        const footY = enemy.y + enemy.h;
        drawGroundShadow(cx, footY, sc);
        drawSprite(
          enemy.spriteImg,
          cx,
          footY,
          drawW,
          drawH,
          enemy.isBoss ? '#702030' : '#5a3a72',
        );
        if (enemy.isBoss) {
          ctx.fillStyle = GACHA_STYLE.goldLight;
          ctx.font = '11px Georgia';
          ctx.fillText(`BOSS P${enemy.phase}`, enemy.x, enemy.y - 6);
        }
      }

      const playerSc = scaleAt(player.y + player.h);
      drawGroundShadow(player.x + player.w / 2, player.y + player.h, playerSc);
      drawSprite(
        heroImg,
        player.x + player.w / 2,
        player.y + player.h,
        player.w * 2.2 * playerSc,
        player.h * 2.4 * playerSc,
        GACHA_STYLE.gold,
        true,
      );

      if (banner) drawWaveBanner(banner);
      if (overlay) drawOverlayMessage(overlay.title, overlay.subtitle);

      if (blessingPicks?.length) {
        drawBlessingScreen(blessingPicks);
      } else if (hud) {
        if (hudOverlay) {
          ctx.save();
          ctx.globalAlpha = 0.94;
          ctx.drawImage(hudOverlay, 0, 0, W, H);
          ctx.restore();
          drawCombo(hud.combo ?? 0);
          drawHpBar(hud.hp ?? 3, hud.maxHp ?? 10);
        } else {
          drawTopHud(hud);
          drawCombo(hud.combo ?? 0);
          drawSkillBar(hud.skills ?? [], hud.ultReady ?? false);
          drawHpBar(hud.hp ?? 3, hud.maxHp ?? 10);
        }
      }
    },
  };
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
