const CACHE_SHELL = 'aetherlink-shell-v5';
const CACHE_ASSETS = 'aetherlink-assets-v5';

// Only cache static assets and public shell - NOT auth-protected routes
const STATIC_ASSETS = ['/manifest.json', '/favicon.ico'];

// Routes that should NEVER be cached (require authentication)
const PROTECTED_ROUTES = [
  '/dashboard',
  '/feed',
  '/cv',
  '/applied',
  '/onboarding',
  '/tracker'
];

// Check if request is for a protected route
function isProtectedRoute(url) {
  const pathname = new URL(url).pathname;
  
  // Exact matches
  if (PROTECTED_ROUTES.some(route => pathname === route)) {
    return true;
  }
  
  // Dynamic route patterns
  if (pathname.startsWith('/feed/') || 
      pathname.startsWith('/api/auth/') ||
      pathname.startsWith('/api/')) {
    return true;
  }
  
  return false;
}

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
  
  // Always skip non-GET requests and external requests
  if (request.method !== 'GET' || url.hostname !== self.location.hostname) {
    event.respondWith(fetch(request));
    return;
  }
  
  // Skip ALL protected routes - no caching, network only
  if (isProtectedRoute(request.url)) {
    event.respondWith(fetch(request));
    return;
  }
  
  // Skip API calls, auth routes, Next.js internal routes, Supabase
  if (
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
            if (res.ok && res.status !== 301 && res.status !== 302 && res.status !== 307 && res.status !== 308) {
              cache.put(request, res.clone());
            }
            return res;
          });
        }),
      ),
    );
    return;
  }
  
  // For public routes (like home page) - network first
  event.respondWith(
    fetch(request, { redirect: 'follow' })
      .then((response) => {
        // Don't cache redirects or error responses
        if (response.ok && response.status !== 301 && response.status !== 302 && response.status !== 307 && response.status !== 308) {
          return response;
        }
        return response; // Just return the response, don't cache
      })
      .catch(() => {
        // Fallback to cached static assets if network fails
        return caches.match('/');
      })
  );
});