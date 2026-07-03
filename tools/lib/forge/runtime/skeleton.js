/**
 * SQUELETTE — échantillonnage des clips + dessin canvas des rigs paper-doll.
 * L'échantillonnage est pur (utilisable hors DOM) ; seul draw() touche canvas.
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
export function drawSkeleton(ctx, rig, images, pose, { x, y, height, flip = false, alpha = 1, flash = false }) {
  const s = height / rig.frame.h;
  const world = boneWorldTransforms(rig, pose);
  ctx.save();
  ctx.globalAlpha = alpha;
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
