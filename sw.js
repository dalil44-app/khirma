const CACHE_NAME = 'khirma-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// ── INSTALL — cache the shell ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// ── MESSAGE — استجابة فورية لطلب تخطي الانتظار ──
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── ACTIVATE — clean old caches ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── FETCH — network first, fallback to cache (good for live data + offline shell) ──
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // لا تتدخل في طلبات Supabase أو خرائط — تذهب للشبكة مباشرة
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('openstreetmap.org') ||
    url.hostname.includes('tile.osm')
  ) {
    return;
  }

  // فقط GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // خزّن نسخة محدثة في الكاش
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/index.html')))
  );
});
