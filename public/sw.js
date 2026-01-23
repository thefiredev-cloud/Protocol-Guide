/**
 * Protocol Guide Service Worker
 * Provides offline caching and PWA functionality
 */

const CACHE_VERSION = 'v2';
const CACHE_NAME = `protocol-guide-${CACHE_VERSION}`;
const OFFLINE_PAGE = '/offline.html';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  OFFLINE_PAGE,
  '/icon-192.png',
  '/icon-512.png',
];

// Install - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('protocol-guide-') && name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch strategy: Network-first with cache fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests
  if (url.origin !== location.origin) return;

  // Skip API calls - always go to network
  if (url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/trpc/') ||
      url.pathname.includes('/_expo/')) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only cache successful responses
        if (response.ok) {
          // Clone the response before caching
          const responseClone = response.clone();

          // Cache strategy: cache everything except HTML for offline use
          if (!url.pathname.endsWith('.html') && url.pathname !== '/') {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
        }
        return response;
      })
      .catch(async () => {
        // Network failed, try cache
        const cachedResponse = await caches.match(request);

        if (cachedResponse) {
          console.log('[SW] Serving from cache:', request.url);
          return cachedResponse;
        }

        // For navigation requests, return offline page
        if (request.mode === 'navigate') {
          console.log('[SW] Serving offline page');
          const offlinePage = await caches.match(OFFLINE_PAGE);
          return offlinePage || new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/html' }
          });
        }

        // For other requests, return a generic offline response
        console.log('[SW] No cache available for:', request.url);
        return new Response('Offline - Resource not available', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
  );
});

// Handle service worker messages
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Skipping waiting...');
    self.skipWaiting();
  }
});
