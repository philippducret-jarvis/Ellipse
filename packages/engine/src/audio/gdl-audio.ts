/**
 * Lecture audio depuis URLs GDL (BGM/SFX) avec repli game-feel oscillateurs.
 */
export type GdlAudioBus = {
  bgm?: HTMLAudioElement;
  sfxCache: Map<string, HTMLAudioElement>;
};

export function createGdlAudioBus(): GdlAudioBus {
  return { sfxCache: new Map() };
}

export async function loadGdlAudio(
  bus: GdlAudioBus,
  gdl: { meta?: Record<string, unknown>; audio?: { bgm?: string; sfx?: Record<string, string> } },
): Promise<void> {
  const meta = gdl.meta as { audio?: { bgm?: string } } | undefined;
  const bgmUrl = gdl.audio?.bgm ?? meta?.audio?.bgm;
  if (bgmUrl && typeof Audio !== 'undefined') {
    try {
      bus.bgm = new Audio(bgmUrl);
      bus.bgm.loop = true;
      bus.bgm.volume = 0.35;
      await bus.bgm.play().catch(() => undefined);
    } catch {
      /* optional */
    }
  }
  const sfx = gdl.audio?.sfx ?? {};
  for (const [key, url] of Object.entries(sfx)) {
    if (!url || typeof Audio === 'undefined') continue;
    try {
      const a = new Audio(url);
      a.volume = 0.5;
      bus.sfxCache.set(key, a);
    } catch {
      /* optional */
    }
  }
}

export function playGdlSfx(bus: GdlAudioBus, eventType: string): boolean {
  const map: Record<string, string> = {
    jump: 'jump',
    collect: 'collect',
    enemy_killed: 'hit',
    damage: 'hurt',
    win: 'victory',
    lose: 'defeat',
  };
  const key = map[eventType] ?? eventType;
  const clip = bus.sfxCache.get(key);
  if (!clip) return false;
  try {
    clip.currentTime = 0;
    void clip.play();
    return true;
  } catch {
    return false;
  }
}

export function disposeGdlAudio(bus: GdlAudioBus): void {
  bus.bgm?.pause();
  bus.bgm = undefined;
  bus.sfxCache.clear();
}
