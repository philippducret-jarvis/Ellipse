const CACHE = 'orbes-astra-v2';
const CORE = [
  './',
  './index.html',
  './styles.css',
  './game.js',
  './game.gdl.json',
  './manifest.webmanifest',
  './engine/ellipse-engine.js',
  './assets/astral-observatory-v3.png',
  './assets/keepers-roster-v3.png',
  './assets/astral-sanctuary-v3.png',
  './assets/astral-prologue-v3.png',
  './assets/void-leviathan-v3.png',
  './assets/app-icon-512.png',
  './assets/astral-super-magic-v1.png',
  ...Array.from({ length: 24 }, (_, frame) => `./assets/guardians/guardian-${String(frame).padStart(2, '0')}.png`),
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      if (!response || response.status !== 200 || response.type === 'opaque') return response;
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      return response;
    })),
  );
});
