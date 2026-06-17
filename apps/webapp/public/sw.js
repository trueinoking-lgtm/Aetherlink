const CACHE_SHELL = 'aetherlink-shell-v3';
const SHELL_URLS = ['/dashboard', '/feed', '/cv', '/applied', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_SHELL).then((cache) => cache.addAll(SHELL_URLS).catch(() => undefined)),
  );
  self.skipWaiting();
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/') ||
    url.hostname.includes('supabase')
  ) {
    event.respondWith(fetch(request));
    return;
  }

  if (url.pathname.match(/\.(png|svg|woff2?|ico)$/) || SHELL_URLS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_SHELL).then((c) => c.put(request, copy));
        return res;
      })),
    );
    return;
  }

  event.respondWith(
    fetch(request).catch(() => caches.match('/dashboard')),
  );
});
