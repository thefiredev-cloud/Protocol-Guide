/**
 * Protocol Guide Service Worker v3
 * Optimized for EMS field use with aggressive caching and offline-first strategy
 *
 * Performance targets:
 * - Static assets: Cache-first (instant load)
 * - API calls: Network-first with cache fallback
 * - Protocol data: Stale-while-revalidate (show cached, update in background)
 * - Search results: Cache for 1 hour (protocols rarely change)
 */

const CACHE_VERSION = 'v3';
const STATIC_CACHE = `protocol-guide-static-${CACHE_VERSION}`;
const API_CACHE = `protocol-guide-api-${CACHE_VERSION}`;
const PROTOCOL_CACHE = `protocol-guide-protocols-${CACHE_VERSION}`;
const OFFLINE_PAGE = '/offline.html';

// Cache TTL in milliseconds
const CACHE_TTL = {
  protocols: 60 * 60 * 1000, // 1 hour for protocol data
  stats: 30 * 60 * 1000, // 30 minutes for stats
  coverage: 24 * 60 * 60 * 1000, // 24 hours for coverage (rarely changes)
};

// Static assets to cache on install (critical for offline use)
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  OFFLINE_PAGE,
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.ico',
];

// API patterns to cache with stale-while-revalidate
const CACHEABLE_API_PATTERNS = [
  /\/api\/trpc\/search\.stats/,
  /\/api\/trpc\/search\.coverageByState/,
  /\/api\/trpc\/search\.agenciesWithProtocols/,
  /\/api\/trpc\/search\.semantic/,
  /\/api\/trpc\/search\.searchByAgency/,
];

// Install - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW v3] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW v3] Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => {
          // Add cache-busting for development
          return url;
        }));
      })
      .then(() => {
        console.log('[SW v3] Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW v3] Static cache failed:', error);
      })
  );
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW v3] Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              // Delete old version caches
              return (
                name.startsWith('protocol-guide-') &&
                !name.includes(CACHE_VERSION)
              );
            })
            .map((name) => {
              console.log('[SW v3] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW v3] Activated');
        return self.clients.claim();
      })
  );
});

/**
 * Check if a URL matches cacheable API patterns
 */
function isCacheableApi(url) {
  return CACHEABLE_API_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * Get cache TTL for a URL
 */
function getCacheTtl(url) {
  if (url.includes('stats')) return CACHE_TTL.stats;
  if (url.includes('coverage')) return CACHE_TTL.coverage;
  return CACHE_TTL.protocols;
}

/**
 * Check if cached response is still valid
 */
function isCacheValid(response, ttl) {
  if (!response) return false;
  const cachedAt = response.headers.get('sw-cached-at');
  if (!cachedAt) return true; // Assume valid if no timestamp
  const age = Date.now() - parseInt(cachedAt, 10);
  return age < ttl;
}

/**
 * Clone response with cache timestamp
 */
function addCacheTimestamp(response) {
  const headers = new Headers(response.headers);
  headers.set('sw-cached-at', Date.now().toString());
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// Fetch handler with optimized strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests (except for static assets)
  if (url.origin !== location.origin) return;

  // Skip WebSocket connections
  if (url.protocol === 'ws:' || url.protocol === 'wss:') return;

  // Strategy 1: Cache-first for static assets
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/) ||
    url.pathname.startsWith('/_expo/static/')
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Strategy 2: Stale-while-revalidate for cacheable API calls
  if (isCacheableApi(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE));
    return;
  }

  // Strategy 3: Network-first for other API calls
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/trpc/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Strategy 4: Network-first with offline fallback for navigation
  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request));
    return;
  }

  // Default: Network-first
  event.respondWith(networkFirst(request));
});

/**
 * Cache-first strategy - best for static assets
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW v3] Cache-first fetch failed:', request.url);
    return new Response('Offline - Resource not available', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/**
 * Stale-while-revalidate strategy - best for API data
 * Returns cached data immediately, updates cache in background
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const ttl = getCacheTtl(request.url);

  // If we have a valid cached response, return it and revalidate in background
  if (cached && isCacheValid(cached, ttl)) {
    // Revalidate in background (don't await)
    fetchAndCache(request, cache).catch(err => {
      console.log('[SW v3] Background revalidation failed:', err);
    });
    return cached;
  }

  // No valid cache, fetch from network
  try {
    const response = await fetch(request);
    if (response.ok) {
      const timestampedResponse = addCacheTimestamp(response.clone());
      cache.put(request, timestampedResponse);
    }
    return response;
  } catch (error) {
    // Return stale cache if network fails
    if (cached) {
      console.log('[SW v3] Returning stale cache for:', request.url);
      return cached;
    }
    throw error;
  }
}

/**
 * Fetch and update cache (for background revalidation)
 */
async function fetchAndCache(request, cache) {
  const response = await fetch(request);
  if (response.ok) {
    const timestampedResponse = addCacheTimestamp(response.clone());
    await cache.put(request, timestampedResponse);
  }
  return response;
}

/**
 * Network-first strategy - for real-time data
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Navigation handler with offline fallback
 */
async function navigationHandler(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    console.log('[SW v3] Navigation offline, serving offline page');
    const offlinePage = await caches.match(OFFLINE_PAGE);
    return offlinePage || new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

// Handle service worker messages
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('[SW v3] Skip waiting requested');
    self.skipWaiting();
  }

  if (event.data?.type === 'CACHE_PROTOCOL') {
    // Pre-cache a specific protocol for offline use
    const { url, data } = event.data;
    caches.open(PROTOCOL_CACHE).then((cache) => {
      const response = new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          'sw-cached-at': Date.now().toString(),
        },
      });
      cache.put(url, response);
    });
  }

  if (event.data?.type === 'CLEAR_CACHE') {
    // Clear all protocol caches
    Promise.all([
      caches.delete(API_CACHE),
      caches.delete(PROTOCOL_CACHE),
    ]).then(() => {
      console.log('[SW v3] Caches cleared');
    });
  }

  if (event.data?.type === 'GET_CACHE_SIZE') {
    // Report cache size for debugging
    getCacheSize().then((size) => {
      event.source?.postMessage({
        type: 'CACHE_SIZE',
        size,
      });
    });
  }
});

/**
 * Calculate total cache size
 */
async function getCacheSize() {
  let totalSize = 0;
  const cacheNames = await caches.keys();

  for (const cacheName of cacheNames) {
    if (!cacheName.startsWith('protocol-guide-')) continue;

    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    for (const key of keys) {
      const response = await cache.match(key);
      if (response) {
        const blob = await response.clone().blob();
        totalSize += blob.size;
      }
    }
  }

  return totalSize;
}
