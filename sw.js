// Florium — service worker для встановлення панелі як програми.
// Мережа першою: оновлення з GitHub з'являються одразу; кеш — лише коли нема інтернету.
// Запити до Apps Script (script.google.com), шрифтів і CDN не чіпаємо взагалі.
const CACHE = 'florium-app-v1';
const CORE = ['./admin-panel.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const net = req.mode === 'navigate' ? fetch(req.url, {cache: 'no-cache', credentials: 'same-origin'}) : fetch(req);
  e.respondWith(net.then(res => {
    if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req.mode === 'navigate' ? url.pathname : req, copy)); }
    return res;
  }).catch(() => caches.match(req.mode === 'navigate' ? url.pathname : req, {ignoreSearch: true}).then(r => r || caches.match('./admin-panel.html'))));
});
