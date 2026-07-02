/**
 * Export PWA mobile web-first (Lot 9) — descripteurs purs, sans build infra.
 *
 * Génère le Web App Manifest + un service worker minimal (cache-first) + un descripteur
 * d'export par profil perf. La rastérisation HD vient du profil (`pixelRatio`/budgets, Lot 1F).
 */
import type { GameDefinition } from '../index.js';
import { TEXTURE_BUDGETS, type RuntimeProfileId } from '../assets/asset-spec.js';

export interface PwaManifest {
  name: string;
  short_name: string;
  display: 'standalone';
  orientation: 'landscape' | 'portrait';
  background_color: string;
  theme_color: string;
  start_url: string;
  icons: { src: string; sizes: string; type: string }[];
}

export function buildPwaManifest(gdl: GameDefinition, iconUrl = '/icon.png'): PwaManifest {
  const bg = gdl.style?.palette?.[0] ?? '#120f18';
  return {
    name: gdl.meta.title,
    short_name: gdl.meta.title.slice(0, 12),
    display: 'standalone',
    orientation: 'landscape',
    background_color: bg,
    theme_color: bg,
    start_url: './index.html',
    icons: [
      { src: iconUrl, sizes: '192x192', type: 'image/png' },
      { src: iconUrl, sizes: '512x512', type: 'image/png' },
    ],
  };
}

/** Service worker cache-first minimal (chaîne prête à écrire). */
export function buildServiceWorker(cacheName: string, assets: string[]): string {
  const list = JSON.stringify(['./index.html', ...assets]);
  return `const C='${cacheName}';const A=${list};
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(A))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x))))));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));`;
}

export interface MobileExportDescriptor {
  title: string;
  profile: RuntimeProfileId;
  pixel_ratio: number;
  max_texture_size: number;
  manifest: PwaManifest;
  service_worker: string;
}

export function buildMobileExport(
  gdl: GameDefinition,
  profile: RuntimeProfileId = 'mid',
  assets: string[] = [],
): MobileExportDescriptor {
  const budget = TEXTURE_BUDGETS[profile];
  return {
    title: gdl.meta.title,
    profile,
    pixel_ratio: budget.pixelRatio,
    max_texture_size: budget.maxTextureSize,
    manifest: buildPwaManifest(gdl),
    service_worker: buildServiceWorker(`ellipse-${profile}-v1`, assets),
  };
}
