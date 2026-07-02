/**
 * DSL vectoriel HD — univers Veloria (dark fantasy premium, or/violet/carmin).
 * Même principe que generate-echoes-assets : primitives → AssetSpec → raster CPU sharp.
 */
export const VELORIA_PALETTE = ['#16131f', '#241528', '#5a3a72', '#9e4f5c', '#c9a227', '#5ec7ef', '#f0d9a6', '#702030'];

const P = VELORIA_PALETTE;

/** Indices stylistiques Sprint B — affinent les silhouettes procédurales par héro. */
export const HERO_BUILDER_HINTS = {
  aureline: { accent: P[4], torso: P[2], weapon_side: 'right', weapon: 'lance', cape_width: 0.2, head_glow: P[5] },
  morgane: { accent: P[0], torso: P[1], weapon_side: 'both', weapon: 'dual_blades', cape_width: 0.24, head_glow: P[3] },
  selka: { accent: P[4], torso: P[2], weapon_side: 'right', weapon: 'staff', cape_width: 0.18, head_glow: P[6] },
  isolde: { accent: P[7], torso: P[7], weapon_side: 'right', weapon: 'scythe', cape_width: 0.22, head_glow: P[3] },
  roxane: { accent: P[3], torso: P[2], weapon_side: 'front', weapon: 'crossbow', cape_width: 0.16, head_glow: P[5] },
  liora: { accent: P[2], torso: P[2], weapon_side: 'right', weapon: 'orb', cape_width: 0.2, head_glow: P[6] },
};

export const rect = (x, y, w, h, fill, o = {}) => ({ shape: 'rect', x, y, w, h, fill, ...o });
export const circ = (cx, cy, r, fill, o = {}) => ({ shape: 'circle', cx, cy, r, fill, ...o });
export const elli = (cx, cy, rx, ry, fill, o = {}) => ({ shape: 'ellipse', cx, cy, rx, ry, fill, ...o });
export const poly = (points, fill, o = {}) => ({ shape: 'polygon', points, fill, ...o });

export function spec(id, kind, w, h, shapes, bg = null) {
  return { id, kind, width: w, height: h, palette: P, background: bg, layers: [{ id: 'main', shapes }] };
}

/** Cape + silhouette héroïne de base (paramètres issus du profil Sprint B). */
function heroBase(w, h, profile, frame = 0) {
  const cx = w / 2;
  const sway = Math.sin(frame * 0.8) * w * 0.02;
  const legShift = frame % 2 === 0 ? -w * 0.03 : w * 0.03;
  const cape = profile.cape_width ?? 0.2;
  return [
    elli(cx + sway, h * 0.92, w * 0.22, h * 0.05, P[0], { opacity: 0.55 }),
    poly(
      [
        [cx - w * cape, h * 0.95],
        [cx + w * cape, h * 0.95],
        [cx + w * (cape * 0.7) + legShift, h * 0.58],
        [cx - w * (cape * 0.7) + legShift, h * 0.58],
      ],
      P[1],
    ),
    rect(cx - w * 0.11 + sway, h * 0.38, w * 0.22, h * 0.28, profile.torso ?? P[2], { rx: w * 0.04 }),
    circ(cx + sway, h * 0.28, w * 0.11, profile.head_glow ?? P[5], { opacity: 0.35 }),
    circ(cx + sway, h * 0.24, w * 0.09, profile.head_glow ?? P[5]),
    poly([[cx - w * 0.08 + sway, h * 0.3], [cx + w * 0.08 + sway, h * 0.3], [cx + sway, h * 0.14]], profile.accent ?? P[4]),
  ];
}

function weaponShapes(key, w, h, profile, frame = 0) {
  const accent = profile.accent ?? P[4];
  switch (key) {
    case 'aureline':
      return [
        rect(w * 0.58, h * 0.2, w * 0.06, h * 0.62, accent),
        elli(w * 0.62, h * 0.18, w * 0.04, h * 0.04, P[5]),
        poly([[w * 0.64, h * 0.16], [w * 0.82, h * 0.1], [w * 0.64, h * 0.2]], P[5]),
      ];
    case 'morgane':
      return [
        rect(w * 0.2, h * 0.42 + frame * 2, w * 0.2, w * 0.04, accent, { rx: 2 }),
        rect(w * 0.58, h * 0.44 - frame * 2, w * 0.2, w * 0.04, accent, { rx: 2 }),
        circ(w * 0.72, h * 0.22, w * 0.05, P[0]),
      ];
    case 'selka':
      return [
        rect(w * 0.54, h * 0.15, w * 0.05, h * 0.55, accent),
        circ(w * 0.56, h * 0.12, w * 0.09, P[6], { opacity: 0.7 }),
        circ(w * 0.56, h * 0.12, w * 0.04, P[5]),
      ];
    case 'isolde':
      return [
        rect(w * 0.16, h * 0.38, w * 0.16, h * 0.24, P[3], { rx: 4 }),
        rect(w * 0.58, h * 0.22, w * 0.05, h * 0.58, accent),
        elli(w * 0.6, h * 0.2, w * 0.12, h * 0.06, P[3]),
      ];
    case 'roxane':
      return [
        rect(w * 0.18, h * 0.48, w * 0.36, h * 0.08, P[3], { rx: 3 }),
        rect(w * 0.5, h * 0.46, w * 0.24, h * 0.05, accent),
        circ(w * 0.76, h * 0.47, w * 0.025, P[5]),
      ];
    case 'liora':
      return [
        circ(w * 0.62, h * 0.32 + frame * 3, w * 0.14, P[2], { opacity: 0.35 }),
        circ(w * 0.62, h * 0.32 + frame * 3, w * 0.08, P[6]),
        circ(w * 0.62, h * 0.32 + frame * 3, w * 0.035, P[5]),
      ];
    default:
      return [];
  }
}

/** Overlay accents VFX uniquement — composé en screen sur la planche normalisée (hybrid). */
export function buildHeroAccentOverlay(key) {
  const w = 128;
  const h = 192;
  const profile = HERO_BUILDER_HINTS[key] ?? HERO_BUILDER_HINTS.aureline;
  const shapes = weaponShapes(key, w, h, profile, 0).map((s) => ({ ...s, opacity: Math.min(0.85, (s.opacity ?? 1) * 0.75) }));
  if (key === 'aureline') {
    shapes.push(elli(w * 0.62, h * 0.14, w * 0.08, h * 0.08, P[5], { opacity: 0.45 }));
  }
  if (key === 'liora') {
    shapes.push(elli(w * 0.62, h * 0.32, w * 0.18, h * 0.18, P[6], { opacity: 0.25 }));
  }
  return spec(`hero_accent_${key}`, 'character', w, h, shapes);
}

export function buildHeroSpec(key, frame = 0) {
  const w = 128;
  const h = 192;
  const id = `hero_${key}_f${frame}`;
  const profile = HERO_BUILDER_HINTS[key] ?? HERO_BUILDER_HINTS.aureline;
  const base = heroBase(w, h, profile, frame);
  return spec(id, 'character', w, h, [...base, ...weaponShapes(key, w, h, profile, frame)]);
}

export function buildSupportSpec(key, frame = 0) {
  const w = 96;
  const h = 128;
  const cx = w / 2;
  return spec(`support_${key}_f${frame}`, 'character', w, h, [
    elli(cx, h * 0.9, w * 0.2, h * 0.04, P[0], { opacity: 0.5 }),
    poly([[cx - w * 0.18, h * 0.92], [cx + w * 0.18, h * 0.92], [cx + w * 0.1, h * 0.5], [cx - w * 0.1, h * 0.5]], P[2]),
    circ(cx, h * 0.38, w * 0.1, P[5]),
    circ(cx, h * 0.34, w * 0.07, P[4], { opacity: 0.6 }),
  ]);
}

export function buildEnemySpec(key, frame = 0) {
  const w = 96;
  const h = 96;
  const cx = w / 2;
  const bob = Math.sin(frame) * h * 0.02;

  switch (key) {
    case 'fallen_knight':
      return spec(`enemy_${key}_f${frame}`, 'enemy', w, h, [
        elli(cx, h * 0.88, w * 0.28, h * 0.06, P[0], { opacity: 0.5 }),
        rect(cx - w * 0.2, h * 0.35 + bob, w * 0.4, h * 0.45, P[3], { rx: 6 }),
        rect(cx - w * 0.24, h * 0.22 + bob, w * 0.48, h * 0.18, P[3], { rx: 8 }),
        circ(cx - w * 0.08, h * 0.32 + bob, w * 0.04, P[6]),
        circ(cx + w * 0.08, h * 0.32 + bob, w * 0.04, P[6]),
        rect(cx + w * 0.18, h * 0.4 + bob, w * 0.06, h * 0.35, P[4]),
      ]);
    case 'tomb_hound':
      return spec(`enemy_${key}_f${frame}`, 'enemy', w, h, [
        elli(cx, h * 0.78 + bob, w * 0.35, h * 0.12, P[0]),
        elli(cx - w * 0.12, h * 0.55 + bob, w * 0.14, h * 0.1, P[1]),
        elli(cx + w * 0.12, h * 0.55 + bob, w * 0.14, h * 0.1, P[1]),
        circ(cx - w * 0.2, h * 0.42 + bob, w * 0.08, P[0]),
        circ(cx - w * 0.22, h * 0.4 + bob, w * 0.025, P[6]),
      ]);
    case 'gargoyle':
      return spec(`enemy_${key}_f${frame}`, 'enemy', w, h, [
        poly([[cx, h * 0.15 + bob], [cx - w * 0.35, h * 0.45], [cx - w * 0.15, h * 0.75], [cx + w * 0.15, h * 0.75], [cx + w * 0.35, h * 0.45]], P[3]),
        circ(cx, h * 0.38 + bob, w * 0.06, P[6]),
        circ(cx, h * 0.36 + bob, w * 0.02, P[5]),
      ]);
    case 'fanatic_sister':
      return spec(`enemy_${key}_f${frame}`, 'enemy', w, h, [
        poly([[cx - w * 0.15, h * 0.92], [cx + w * 0.15, h * 0.92], [cx + w * 0.1, h * 0.35], [cx - w * 0.1, h * 0.35]], P[2]),
        circ(cx, h * 0.28, w * 0.08, P[5]),
        circ(cx, h * 0.55 + bob, w * 0.06, P[7], { opacity: 0.8 }),
      ]);
    case 'shadow_acolyte':
      return spec(`enemy_${key}_f${frame}`, 'enemy', w, h, [
        poly([[cx - w * 0.18, h * 0.92], [cx + w * 0.18, h * 0.92], [cx + w * 0.05, h * 0.2], [cx - w * 0.05, h * 0.2]], P[0]),
        circ(cx, h * 0.48 + bob, w * 0.05, P[2], { opacity: 0.9 }),
        circ(cx, h * 0.48 + bob, w * 0.02, P[6]),
      ]);
    default:
      return spec(`enemy_${key}_f${frame}`, 'enemy', w, h, [circ(cx, h * 0.5, w * 0.2, P[3])]);
  }
}

export function buildBossSpec(key, frame = 0) {
  const w = 160;
  const h = 192;
  const cx = w / 2;
  const pulse = frame % 2 === 0 ? 0 : h * 0.015;
  return spec(`boss_${key}_f${frame}`, 'boss', w, h, [
    elli(cx, h * 0.92, w * 0.35, h * 0.06, P[0], { opacity: 0.55 }),
    rect(cx - w * 0.22, h * 0.32 + pulse, w * 0.44, h * 0.52, P[3], { rx: 10 }),
    rect(cx - w * 0.28, h * 0.18 + pulse, w * 0.56, h * 0.2, P[3], { rx: 12 }),
    circ(cx - w * 0.1, h * 0.32 + pulse, w * 0.05, P[6]),
    circ(cx + w * 0.1, h * 0.32 + pulse, w * 0.05, P[6]),
    rect(cx + w * 0.22, h * 0.08 + pulse, w * 0.08, h * 0.75, P[4]),
    poly([[cx + w * 0.26, h * 0.08], [cx + w * 0.42, h * 0.04], [cx + w * 0.26, h * 0.16]], P[5]),
  ]);
}

export function buildEnvironmentSpec(key) {
  const w = 720;
  const h = 1280;
  const shapes = [rect(0, 0, w, h, P[0])];
  const tileRow = (y, count, color, th = 0.04) => {
    for (let i = 0; i < count; i++) shapes.push(rect((w / count) * i, h * y, w / count + 1, h * th, color, { opacity: 0.7 }));
  };

  switch (key) {
    case 'ruined_cloister':
      for (let i = 0; i < 5; i++) {
        const x = 40 + i * 140;
        shapes.push(rect(x, h * 0.25, 48, h * 0.55, P[1], { opacity: 0.85 }));
        shapes.push(poly([[x + 24, h * 0.18], [x - 10, h * 0.28], [x + 58, h * 0.28]], P[2]));
      }
      shapes.push(rect(0, h * 0.78, w, h * 0.22, P[1]));
      shapes.push(elli(w * 0.5, h * 0.35, w * 0.45, h * 0.25, P[2], { opacity: 0.25 }));
      break;
    case 'pyre_road':
      tileRow(0.78, 6, P[3]);
      for (let i = 0; i < 4; i++) {
        shapes.push(elli(80 + i * 160, h * 0.55, 36, 80, P[7], { opacity: 0.55 + i * 0.05 }));
        shapes.push(rect(60 + i * 160, h * 0.72, 120, 8, P[4], { opacity: 0.6 }));
      }
      shapes.push(elli(w * 0.5, h * 0.4, w * 0.5, h * 0.2, P[7], { opacity: 0.15 }));
      break;
    case 'statue_garden':
      for (let i = 0; i < 3; i++) {
        const x = 100 + i * 200;
        shapes.push(rect(x, h * 0.35, 64, h * 0.4, P[3], { opacity: 0.5 }));
        shapes.push(circ(x + 32, h * 0.28, 28, P[3], { opacity: 0.65 }));
      }
      tileRow(0.8, 8, P[2]);
      for (let i = 0; i < 6; i++) shapes.push(poly([[60 + i * 110, h * 0.75], [90 + i * 110, h * 0.75], [75 + i * 110, h * 0.68]], P[4], { opacity: 0.4 }));
      break;
    case 'drowned_port':
      for (let row = 0; row < 5; row++) {
        shapes.push(rect(0, h * (0.5 + row * 0.06), w, h * 0.05, P[2], { opacity: 0.2 + row * 0.05 }));
      }
      for (let i = 0; i < 4; i++) shapes.push(rect(40 + i * 170, h * 0.3, 24, h * 0.45, P[1], { opacity: 0.7 }));
      shapes.push(elli(w * 0.5, h * 0.65, w * 0.55, h * 0.15, P[5], { opacity: 0.2 }));
      break;
    case 'candle_crypt':
      for (let i = 0; i < 6; i++) {
        shapes.push(rect(50 + i * 110, h * 0.22, 40, h * 0.58, P[1], { opacity: 0.75 }));
        shapes.push(circ(70 + i * 110, h * 0.78, 8, P[4], { opacity: 0.9 }));
      }
      shapes.push(circ(w * 0.5, h * 0.45, w * 0.22, P[2], { opacity: 0.35 }));
      shapes.push(poly([[w * 0.5, h * 0.2], [w * 0.35, h * 0.35], [w * 0.65, h * 0.35]], P[4], { opacity: 0.5 }));
      break;
    case 'crepuscule_throne':
      shapes.push(rect(w * 0.25, h * 0.15, w * 0.5, h * 0.12, P[4], { opacity: 0.7 }));
      shapes.push(rect(w * 0.35, h * 0.27, w * 0.3, h * 0.35, P[3], { opacity: 0.85 }));
      for (let i = 0; i < 3; i++) shapes.push(rect(w * 0.2 + i * w * 0.25, h * 0.62, 12, h * 0.18, P[7]));
      shapes.push(elli(w * 0.5, h * 0.5, w * 0.48, h * 0.28, P[7], { opacity: 0.12 }));
      tileRow(0.82, 5, P[0], 0.06);
      break;
    case 'pavillon_veilles':
      shapes.push(circ(w * 0.5, h * 0.42, w * 0.32, P[2], { opacity: 0.35 }));
      shapes.push(rect(w * 0.15, h * 0.55, w * 0.7, h * 0.08, P[4], { opacity: 0.5 }));
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        shapes.push(circ(w * 0.5 + Math.cos(a) * w * 0.28, h * 0.42 + Math.sin(a) * h * 0.12, 28, P[4], { opacity: 0.7 }));
      }
      break;
    default:
      shapes.push(elli(w * 0.5, h * 0.5, w * 0.4, h * 0.3, P[2], { opacity: 0.3 }));
      shapes.push(rect(0, h * 0.8, w, h * 0.2, P[1]));
  }

  return spec(`env_${key}`, 'environment', w, h, shapes, P[0]);
}

export function buildRelicSpec(key) {
  const w = 64;
  const h = 64;
  const c = w / 2;
  return spec(`relic_${key}`, 'prop', w, h, [
    circ(c, c, w * 0.38, P[2], { opacity: 0.3 }),
    poly([[c, h * 0.12], [w * 0.78, c], [c, h * 0.88], [w * 0.22, c]], P[4]),
    circ(c, c, w * 0.12, P[5]),
  ]);
}

export function buildUiSpec(kind) {
  const w = 128;
  const h = 64;
  const c = w / 2;
  if (kind === 'blessing_card') {
    return spec('ui_blessing_card', 'ui', w, h, [
      rect(4, 4, w - 8, h - 8, P[1], { rx: 8 }),
      rect(8, 8, w - 16, h - 16, P[2], { rx: 6, opacity: 0.6 }),
      elli(c, h * 0.45, w * 0.22, h * 0.18, P[4], { opacity: 0.8 }),
    ]);
  }
  if (kind === 'hp_orb') {
    return spec('ui_hp_orb', 'ui', 48, 48, [circ(24, 24, 20, P[7]), circ(24, 24, 12, P[3]), circ(20, 18, 4, P[5], { opacity: 0.5 })]);
  }
  if (kind === 'combat_hud') {
    return spec('ui_combat_hud', 'ui', 360, 640, [
      rect(0, 0, 360, 640, P[0], { opacity: 0.15 }),
      rect(12, 520, 336, 108, P[1], { rx: 12, opacity: 0.85 }),
      rect(24, 536, 80, 80, P[7], { rx: 40 }),
      elli(180, 560, 120, 24, P[2], { opacity: 0.5 }),
      rect(260, 540, 72, 72, P[4], { rx: 8, opacity: 0.7 }),
    ]);
  }
  return spec(`ui_${kind}`, 'ui', w, h, [rect(0, 0, w, h, P[2], { rx: 6 })]);
}

export function buildFxSpec(kind) {
  const w = 64;
  const h = 64;
  const c = w / 2;
  if (kind === 'holy_slash') {
    return spec('fx_holy_slash', 'fx', w, h, [
      poly([[c - 20, h * 0.8], [c + 20, h * 0.2], [c + 28, h * 0.25], [c - 12, h * 0.85]], P[5], { opacity: 0.85 }),
      poly([[c - 8, h * 0.75], [c + 12, h * 0.28], [c + 18, h * 0.32], [c - 2, h * 0.78]], P[4]),
    ]);
  }
  if (kind === 'collapse') {
    return spec('fx_collapse', 'fx', w, h, [
      rect(8, h * 0.5, w - 16, 8, P[7], { opacity: 0.8 }),
      ...Array.from({ length: 6 }, (_, i) => rect(10 + i * 9, h * 0.55 + (i % 2) * 6, 6, 10, P[3])),
    ]);
  }
  return spec(`fx_${kind}`, 'fx', w, h, [circ(c, c, w * 0.3, P[6], { opacity: 0.5 })]);
}

export function builderForAsset(asset) {
  if (asset.role === 'hero') return (f) => buildHeroSpec(asset.key, f);
  if (asset.role === 'companion') return (f) => buildSupportSpec(asset.key, f);
  if (asset.role === 'enemy') return (f) => buildEnemySpec(asset.key, f);
  if (asset.role === 'boss') return (f) => buildBossSpec(asset.key, f);
  if (asset.role === 'environment') return () => buildEnvironmentSpec(asset.key);
  if (asset.role === 'relic' || asset.role === 'armor') return () => buildRelicSpec(asset.key);
  if (asset.role === 'ui') return () => buildUiSpec(asset.key);
  return () => buildRelicSpec(asset.key ?? 'generic');
}
