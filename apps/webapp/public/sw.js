const CACHE_SHELL = 'aetherlink-shell-v4';
const CACHE_ASSETS = 'aetherlink-assets-v4';

// Only cache static assets and public shell - NOT auth-protected routes
const STATIC_ASSETS = ['/manifest.json', '/favicon.ico'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_SHELL).then((cache) =>
      cache.addAll(STATIC_ASSETS).catch(() => undefined),
    ),
  );
  self.skipWaiting();
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_SHELL && k !== CACHE_ASSETS).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  // Skip external requests and API calls
  if (
    url.hostname !== self.location.hostname ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/_next/') ||
    url.hostname.includes('supabase')
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // Cache static assets only
  if (url.pathname.match(/\.(png|svg|woff2?|ico|css|js)$/) || STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.open(CACHE_ASSETS).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request, { redirect: 'follow' }).then((res) => {
            // Only cache successful responses, not redirects
            if (res.ok && res.status !== 301 && res.status !== 302 && res.status !== 307) {
              cache.put(request, res.clone());
            }
            return res;
          });
        }),
      ),
    );
    return;
  }

  // For app routes - network first, fall back to index (let Next.js handle routing)
  event.respondWith(
    fetch(request, { redirect: 'follow' }).catch(() => caches.match('/index.html')),
  );
});
