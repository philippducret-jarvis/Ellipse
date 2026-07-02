export const HERO_RUNTIME_SOURCE = 'ellipse-hero-runtime-pack-v1';

export const PART_DEFS = [
  { id: 'head', label: 'Head', yStart: 0, yEnd: 0.3, pivot: { x: 0.5, y: 0.82 } },
  { id: 'torso', label: 'Torso', yStart: 0.24, yEnd: 0.62, pivot: { x: 0.5, y: 0.16 } },
  { id: 'legs', label: 'Legs', yStart: 0.56, yEnd: 1, pivot: { x: 0.5, y: 0.12 } },
  { id: 'cloak', label: 'Cloak Overlay', yStart: 0.14, yEnd: 1, pivot: { x: 0.5, y: 0.18 } },
  { id: 'glow', label: 'Glow Overlay', yStart: 0, yEnd: 1, pivot: { x: 0.5, y: 0.5 } },
] as const;

export const DEFAULT_ATLAS_FRAME_COUNT = 6;

export const FRAME_TRANSFORMS: Array<Record<string, { x?: number; y?: number }>> = [
  {},
  { head: { y: 0 }, torso: { y: 0 }, cloak: { x: 0, y: 6 }, glow: { y: 0 } },
  { head: { x: 0, y: 0 }, torso: { x: 2, y: 1 }, legs: { x: 6, y: 4 }, cloak: { x: 0, y: 3 } },
  { head: { x: 1, y: 0 }, torso: { x: 0, y: 0 }, legs: { x: 0, y: 2 }, cloak: { x: 10, y: 4 } },
  { head: { y: 0 }, torso: { y: 0 }, legs: { y: 0 }, cloak: { y: 0 }, glow: { y: 0 } },
  { head: { x: 3, y: 0 }, torso: { x: 5, y: 0 }, cloak: { x: 14, y: 2 }, glow: { x: 5 } },
];
