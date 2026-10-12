// Florium — service worker для встановлення панелі як програми.
// Відкриття: якщо мережа відповіла за 3,5 с — свіжа версія з GitHub; якщо ні (поганий звʼязок на складі) —
// одразу копія з телефона, а свіжа тихо докачується на наступне відкриття.
// Запити до Apps Script (script.google.com), шрифтів і CDN не чіпаємо взагалі.
const CACHE = 'florium-app-v2';
const CORE = ['./admin-panel.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
function saveCopy(key, res) {
  if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key, copy)); }
  return res;
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    const key = url.pathname;
    const net = fetch(req.url, {cache: 'no-cache', credentials: 'same-origin'}).then(res => saveCopy(key, res));
    e.respondWith(new Promise(resolve => {
      let done = false;
      const fromCache = () => caches.match(key, {ignoreSearch: true}).then(r => r || caches.match('./admin-panel.html'));
      const timer = setTimeout(() => { fromCache().then(r => { if (r && !done) { done = true; resolve(r); } }); }, 3500);
      net.then(res => { if (!done) { done = true; clearTimeout(timer); resolve(res); } })
         .catch(() => { clearTimeout(timer); fromCache().then(r => { if (!done) { done = true; resolve(r || new Response('Нема звʼязку і немає збереженої копії — відкрий, коли зʼявиться інтернет', {status: 503, headers: {'Content-Type': 'text/plain; charset=utf-8'}})); } }); });
    }));
    e.waitUntil(net.catch(() => {}));
    return;
  }
  e.respondWith(fetch(req).then(res => saveCopy(req, res)).catch(() => caches.match(req, {ignoreSearch: true})));
});
