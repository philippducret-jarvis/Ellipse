export interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'ground' | 'platform' | 'moving';
}

export interface LevelLayout {
  width: number;
  height: number;
  ground_y: number;
  spawn: { x: number; y: number };
  platforms: Platform[];
  collectibles: { x: number; y: number; type: string }[];
  goal?: { x: number; y: number };
  checkpoints?: { x: number; y: number; label: string }[];
  hazards?: { x: number; y: number; w: number; h: number; kind: string }[];
  zones?: {
    id: string;
    label: string;
    x: number;
    y: number;
    w: number;
    h: number;
    theme?: string;
  }[];
}

const GENRE_LAYOUTS: Record<string, (w: number, h: number) => LevelLayout> = {
  platformer: (w, h) => {
    const groundY = h - 80;
    return {
      width: w,
      height: h,
      ground_y: groundY,
      spawn: { x: 100, y: groundY - 64 },
      platforms: [
        { x: 0, y: groundY, w, h: h - groundY, type: 'ground' },
        { x: 320, y: groundY - 120, w: 160, h: 24, type: 'platform' },
        { x: 620, y: groundY - 200, w: 140, h: 24, type: 'platform' },
        { x: 900, y: groundY - 140, w: 180, h: 24, type: 'platform' },
      ],
      collectibles: [
        { x: 380, y: groundY - 160, type: 'coin' },
        { x: 680, y: groundY - 240, type: 'coin' },
        { x: 980, y: groundY - 180, type: 'coin' },
      ],
      goal: { x: w - 120, y: groundY - 64 },
    };
  },
  runner: (w, h) => {
    const groundY = h - 60;
    return {
      width: w,
      height: h,
      ground_y: groundY,
      spawn: { x: 200, y: groundY - 64 },
      platforms: [{ x: 0, y: groundY, w, h: h - groundY, type: 'ground' }],
      collectibles: [
        { x: 400, y: groundY - 80, type: 'coin' },
        { x: 600, y: groundY - 120, type: 'coin' },
      ],
    };
  },
  rpg: (w, h) => ({
    width: w,
    height: h,
    ground_y: h - 40,
    spawn: { x: w / 2, y: h / 2 },
    platforms: [{ x: 0, y: 0, w, h, type: 'ground' }],
    collectibles: [{ x: w / 2 + 100, y: h / 2, type: 'quest_item' }],
  }),
  echoes_mushroom_realm: (w, h) => {
    const groundY = h - 88;
    return {
      width: w,
      height: h,
      ground_y: groundY,
      spawn: { x: 96, y: groundY - 72 },
      platforms: [
        { x: 0, y: groundY, w: 420, h: h - groundY, type: 'ground' },
        { x: 380, y: groundY - 112, w: 176, h: 24, type: 'platform' },
        { x: 548, y: groundY - 184, w: 142, h: 24, type: 'platform' },
        { x: 704, y: groundY - 132, w: 168, h: 24, type: 'platform' },
        { x: 888, y: groundY - 88, w: 154, h: 24, type: 'platform' },
        { x: 1034, y: groundY - 156, w: 126, h: 24, type: 'platform' },
        { x: 1168, y: groundY - 20, w: 112, h: h - (groundY - 20), type: 'ground' },
      ],
      collectibles: [
        { x: 430, y: groundY - 150, type: 'spore' },
        { x: 610, y: groundY - 222, type: 'memory_shard' },
        { x: 776, y: groundY - 172, type: 'spore' },
        { x: 956, y: groundY - 128, type: 'weapon_echo' },
      ],
      checkpoints: [
        { x: 104, y: groundY - 76, label: 'Reveil' },
        { x: 742, y: groundY - 164, label: 'Zone des armes' },
      ],
      hazards: [
        { x: 468, y: groundY + 6, w: 76, h: 18, kind: 'spikes' },
        { x: 1070, y: groundY + 6, w: 82, h: 18, kind: 'root_spikes' },
      ],
      zones: [
        { id: 'awakening', label: 'Reveil sous l arbre originel', x: 0, y: 0, w: 320, h, theme: 'origin' },
        { id: 'descent', label: 'Descente et decouverte', x: 320, y: 0, w: 360, h, theme: 'ruins' },
        { id: 'armory', label: 'Zone de test des armes', x: 680, y: 0, w: 320, h, theme: 'armory' },
        { id: 'exit', label: 'Sortie vers la suite', x: 1000, y: 0, w: 280, h, theme: 'gate' },
      ],
      goal: { x: w - 88, y: groundY - 84 },
    };
  },
};

export function generateLevelLayout(
  genre: string,
  width = 1280,
  height = 720,
  preset?: string,
): LevelLayout {
  const lookupKey = preset ?? genre;
  const fn = GENRE_LAYOUTS[lookupKey] ?? GENRE_LAYOUTS[genre] ?? GENRE_LAYOUTS.platformer!;
  return fn(width, height);
}
