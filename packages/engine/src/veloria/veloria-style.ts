/** Style GACHA Veloria — calqué gacha-renderer.js */
export const VELORIA_GACHA = {
  gold: 0xc9a227,
  goldLight: 0xf0d9a6,
  violet: 0x5a3a72,
  bg: 0x07060a,
  hp: 0xc0392b,
  hpFill: 0xe74c3c,
  panel: 0x07060a,
} as const;

export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
