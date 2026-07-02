/**
 * Math profondeur 2.5D — runtime canvas (parité @ellipse/shared/gdl/depth).
 * Utilisé par integrated-runtime.js si ?legacy=1
 */
export function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

export function depthAt(y, horizonY, groundY) {
  const span = groundY - horizonY;
  if (span <= 0) return 0.5;
  return clamp01((y - horizonY) / span);
}

export function scaleAtY(y, horizonY, groundY, scaleRange = [0.5, 1.12]) {
  const d = depthAt(y, horizonY, groundY);
  return scaleRange[0] + (scaleRange[1] - scaleRange[0]) * d;
}

export function feetY(entityY, height, feetOffset = 0.92) {
  return entityY + height * feetOffset;
}

export function resolveScrollFactor(layer) {
  if (typeof layer.scroll_factor === 'number') return layer.scroll_factor;
  if (typeof layer.parallax === 'number') return layer.parallax;
  return 1;
}

/** Offset parallax dans parent déjà translaté par −caméra. */
export function parallaxCompensation(camX, camY, scrollFactor) {
  return {
    x: camX * (1 - scrollFactor),
    y: camY * (1 - scrollFactor),
  };
}

export function laneParallaxShift(laneIndex, laneCount, strength = 22) {
  if (laneCount <= 1) return 0;
  const center = (laneCount - 1) / 2;
  return (laneIndex - center) * strength;
}

/** Tri painter : entités plus bas = dessinées après. */
export function sortByFeetY(entities, feetOffset = 0.92) {
  return [...entities].sort(
    (a, b) => feetY(a.y, a.h ?? a.height ?? 64, a.feetOffset ?? feetOffset)
      - feetY(b.y, b.h ?? b.height ?? 64, b.feetOffset ?? feetOffset),
  );
}
