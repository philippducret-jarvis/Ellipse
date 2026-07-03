/**
 * SQUELETTE + MARIONNETTE — deux rendus de personnages :
 *
 * drawPuppet (DÉFAUT) — la technique des gachas (Live2D-lite) : l'illustration
 * COMPLÈTE est découpée en bandes horizontales ondulées (respiration, étoffe,
 * inclinaison) + squash & stretch global. Réf. Don't Starve : le charme du
 * cut-out vient de l'exagération squash/bounce, JAMAIS de fausses rotations
 * de jambes sur textures découpées.
 *
 * drawSkeleton (legacy) — paper-doll 8 pièces ; gardé pour le futur
 * (retarget de mocap quand les pièces seront segmentées proprement).
 */

// ── interpolation ──
const ease = (a, b, t) => a + (b - a) * (0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, t))));

/** Échantillonne un clip à l'instant t (s) → pose { bone: {rot,dx,dy,sx,sy} }. */
export function sampleClip(clipsDoc, name, t) {
  const clip = clipsDoc.clips[name] ?? clipsDoc.clips.idle;
  if (!clip) return {};
  let u = t / clip.duration;
  u = clip.loop ? u % 1 : Math.min(1, u);
  const pose = {};
  for (const [bone, keys] of Object.entries(clip.tracks)) {
    let k0 = keys[0], k1 = keys[keys.length - 1];
    for (let i = 0; i < keys.length - 1; i++) {
      if (u >= keys[i].t && u <= keys[i + 1].t) { k0 = keys[i]; k1 = keys[i + 1]; break; }
    }
    const span = Math.max(1e-6, k1.t - k0.t);
    const lt = (u - k0.t) / span;
    const out = {};
    for (const prop of ['rot', 'dx', 'dy', 'sx', 'sy']) {
      const a = k0[prop], b = k1[prop];
      if (a === undefined && b === undefined) continue;
      out[prop] = ease(a ?? (prop.startsWith('s') ? 1 : 0), b ?? (prop.startsWith('s') ? 1 : 0), lt);
    }
    pose[bone] = out;
  }
  return pose;
}

/**
 * MARIONNETTE — dessine l'illustration complète en ~22 bandes horizontales
 * ondulées. Toutes les amplitudes sont en fractions de la hauteur affichée.
 * @param {object} w warp : {breathe, cloth, clothAmp, lean, hop, sx, sy, tremble}
 */
export function drawPuppet(ctx, img, { x, y, height, flip = false, alpha = 1, flash = false, halo = 0, time = 0, warp = {} }) {
  const BANDS = 22;
  const ratio = img.width / img.height;
  const w = height * ratio;
  const sx = warp.sx ?? 1, sy = warp.sy ?? 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (halo > 0) { ctx.shadowColor = 'rgba(4,2,10,0.85)'; ctx.shadowBlur = halo; }
  if (flash) ctx.filter = 'brightness(1.8) saturate(0.6)';
  // ancre aux pieds + squash/stretch autour de l'ancre + flip
  ctx.translate(x, y + (warp.hop ?? 0) * height);
  ctx.scale(flip ? -sx : sx, sy);
  if (warp.rot) ctx.rotate((warp.rot * Math.PI) / 180);
  ctx.translate(-w / 2, -height);

  const bandH = height / BANDS;
  const srcBand = img.height / BANDS;
  const lean = (warp.lean ?? 0) * height * 0.010; // cisaillement : haut décalé
  const breathe = warp.breathe ?? 0;
  const clothAmp = (warp.clothAmp ?? 0.012) * height;
  for (let i = 0; i < BANDS; i++) {
    const f = i / (BANDS - 1); // 0 = tête, 1 = pieds
    // étoffe : onde voyageante, amplitude croissante vers l'ourlet
    const cloth = Math.sin(time * 2.2 + f * 5.2) * clothAmp * Math.pow(f, 1.7) * (warp.cloth ?? 1);
    // respiration : léger gonflement du buste (bandes 25-55 %)
    const chest = breathe * height * 0.006 * Math.exp(-Math.pow((f - 0.38) / 0.16, 2));
    // inclinaison : le haut suit le mouvement
    const shear = lean * (1 - f);
    const trembleX = warp.tremble ? (Math.random() - 0.5) * warp.tremble * height : 0;
    ctx.drawImage(
      img,
      0, i * srcBand, img.width, srcBand + 1.5,
      cloth + chest + shear + trembleX, i * bandH, w, bandH + 1.2,
    );
  }
  ctx.restore();
  if (flash) ctx.filter = 'none';
}

/** Fond deux poses (crossfade entre clips) : t=0 → a, t=1 → b. */
export function blendPoses(a, b, t) {
  if (t >= 1) return b;
  if (t <= 0) return a;
  const out = {};
  const bones = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const bone of bones) {
    const pa = a[bone] ?? {}, pb = b[bone] ?? {};
    const o = {};
    for (const prop of ['rot', 'dx', 'dy', 'sx', 'sy']) {
      const va = pa[prop], vb = pb[prop];
      if (va === undefined && vb === undefined) continue;
      const def = prop.startsWith('s') ? 1 : 0;
      o[prop] = (va ?? def) + ((vb ?? def) - (va ?? def)) * t;
    }
    out[bone] = o;
  }
  return out;
}

// ── mat2d [a,b,c,d,e,f] ──
const I = [1, 0, 0, 1, 0, 0];
const mul = (m, n) => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
const translate = (x, y) => [1, 0, 0, 1, x, y];
function aroundPivot(px, py, rotDeg = 0, sx = 1, sy = 1) {
  const r = (rotDeg * Math.PI) / 180, cos = Math.cos(r), sin = Math.sin(r);
  // T(p) · R · S · T(-p)
  return mul(mul(translate(px, py), [cos * sx, sin * sx, -sin * sy, cos * sy, 0, 0]), translate(-px, -py));
}

/** Transforms monde par pièce (repère du rig), à partir d'une pose. */
export function boneWorldTransforms(rig, pose) {
  const fh = rig.frame.h;
  const rp = pose.root ?? {};
  const world = { root: mul(translate((rp.dx ?? 0) * fh, (rp.dy ?? 0) * fh), aroundPivot(rig.root.x, rig.root.y, rp.rot ?? 0)) };
  const byId = Object.fromEntries(rig.parts.map((p) => [p.id, p]));
  const resolve = (id) => {
    if (world[id]) return world[id];
    const part = byId[id];
    const parentT = part.parent === 'root' ? world.root : resolve(part.parent);
    const bp = pose[id] ?? {};
    world[id] = mul(mul(parentT, translate((bp.dx ?? 0) * fh, (bp.dy ?? 0) * fh)), aroundPivot(part.pivot.x, part.pivot.y, bp.rot ?? 0, bp.sx ?? 1, bp.sy ?? 1));
    return world[id];
  };
  for (const p of rig.parts) resolve(p.id);
  return world;
}

/**
 * Dessine le rig sur ctx. images = { partId: HTMLImageElement }.
 * (x,y) = position de l'ancre (pieds) à l'écran ; height = hauteur cible px.
 */
export function drawSkeleton(ctx, rig, images, pose, { x, y, height, flip = false, alpha = 1, flash = false, halo = 0 }) {
  const s = height / rig.frame.h;
  const world = boneWorldTransforms(rig, pose);
  ctx.save();
  ctx.globalAlpha = alpha;
  if (halo > 0) { ctx.shadowColor = 'rgba(4,2,10,0.85)'; ctx.shadowBlur = halo; } // séparation perso/décor
  if (flash) ctx.filter = 'brightness(1.8) saturate(0.6)';
  ctx.translate(x, y);
  ctx.scale(flip ? -s : s, s);
  ctx.translate(-rig.anchor.x * rig.frame.w, -rig.frame.h);
  for (const part of rig.parts) {
    const img = images[part.id];
    if (!img) continue;
    const m = world[part.id];
    ctx.save();
    ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
    ctx.drawImage(img, part.x, part.y, part.w, part.h);
    ctx.restore();
  }
  ctx.restore();
  if (flash) ctx.filter = 'none';
}
