/* Notenheft Service Worker – speichert nur den Programmcode für Offline-Nutzung, niemals Noten. */
const CACHE = 'notenheft-v6.2.1';
const ASSETS = [
  './', './index.html', './style.css', './app.js', './manifest.webmanifest',
  './icons/icon.svg', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', e => {
  // cache: 'reload' – sonst kann der Browser-Zwischenspeicher beim Update noch alte Dateien liefern
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  // Nur eigene Dateien cachen – GitHub-API-Aufrufe laufen immer direkt übers Netz.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: true }) ||
      (req.mode === 'navigate' ? await cache.match('./index.html') : undefined);
    const network = fetch(req).then(res => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => undefined);
    return cached || (await network) || new Response('Offline', { status: 503 });
  })());
});

// Push-Nachricht (Erinnerung am Freitag): Inhalt kommt verschlüsselt von der GitHub-Aufgabe im Daten-Repo.
self.addEventListener('push', e => {
  let d = { title: 'Notenheft', body: 'Für diese Woche fehlen noch mündliche Noten.' };
  try { if (e.data) d = Object.assign(d, e.data.json()); } catch { /* Standardtext */ }
  e.waitUntil(self.registration.showNotification(d.title, { body: d.body, icon: './icons/icon-192.png', badge: './icons/icon-192.png', tag: 'notenheft-noten' }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => cs.length ? cs[0].focus() : self.clients.openWindow('./')));
});
