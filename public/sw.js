/**
 * MillOS Service Worker
 *
 * Provides offline caching for faster loads and offline support.
 * Uses cache-first for static assets, network-first for API calls.
 *
 * Cache Strategy:
 * - Static assets (JS, CSS, fonts, images): Cache-first with network fallback
 * - Audio files: Cache-first (large files benefit most from caching)
 * - 3D models (GLB, GLTF): Cache-first
 * - HDRI files: Cache-first
 * - API calls: Network-first with cache fallback
 * - HTML: Network-first (always get latest)
 */

const CACHE_NAME = 'millos-v1';
const STATIC_CACHE = 'millos-static-v1';
const AUDIO_CACHE = 'millos-audio-v1';
const MODEL_CACHE = 'millos-models-v1';

// Assets to precache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/hdri/warehouse.hdr',
];

// File extensions to cache with cache-first strategy
const CACHE_FIRST_EXTENSIONS = [
  '.js',
  '.css',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.webp',
  '.ico',
];

// Large assets that should be cached aggressively
const AUDIO_EXTENSIONS = ['.mp3', '.ogg', '.wav', '.m4a'];
const MODEL_EXTENSIONS = ['.glb', '.gltf', '.bin', '.hdr', '.ktx2'];

/**
 * Get the appropriate cache name for a URL
 */
function getCacheName(url) {
  const pathname = new URL(url).pathname;
  const ext = pathname.substring(pathname.lastIndexOf('.'));

  if (AUDIO_EXTENSIONS.includes(ext)) {
    return AUDIO_CACHE;
  }
  if (MODEL_EXTENSIONS.includes(ext)) {
    return MODEL_CACHE;
  }
  return STATIC_CACHE;
}

/**
 * Determine if URL should use cache-first strategy
 */
function shouldCacheFirst(url) {
  const pathname = new URL(url).pathname;
  const ext = pathname.substring(pathname.lastIndexOf('.'));

  return (
    CACHE_FIRST_EXTENSIONS.includes(ext) ||
    AUDIO_EXTENSIONS.includes(ext) ||
    MODEL_EXTENSIONS.includes(ext)
  );
}

/**
 * Install event - precache essential assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Precaching essential assets');
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Some assets failed to precache:', err);
      });
    })
  );

  // Immediately take control
  self.skipWaiting();
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            // Delete old cache versions
            return (
              name.startsWith('millos-') &&
              ![CACHE_NAME, STATIC_CACHE, AUDIO_CACHE, MODEL_CACHE].includes(name)
            );
          })
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );

  // Take control of all pages immediately
  self.clients.claim();
});

/**
 * Fetch event - handle caching strategies
 */
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests (except for CDN resources we want to cache)
  const requestUrl = new URL(url);
  if (requestUrl.origin !== self.location.origin) {
    // Allow caching of DRACO decoder from CDN
    if (!url.includes('gstatic.com/draco')) {
      return;
    }
  }

  // Skip service worker and hot reload requests in development
  if (url.includes('sw.js') || url.includes('__vite') || url.includes('/@')) {
    return;
  }

  // Determine caching strategy
  if (shouldCacheFirst(url)) {
    // Cache-first strategy for static assets
    event.respondWith(cacheFirst(event.request));
  } else {
    // Network-first strategy for HTML and API calls
    event.respondWith(networkFirst(event.request));
  }
});

/**
 * Cache-first strategy: Try cache, fall back to network
 */
async function cacheFirst(request) {
  const cacheName = getCacheName(request.url);

  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Return cached response immediately
      // Optionally update cache in background (stale-while-revalidate)
      return cachedResponse;
    }

    // Not in cache, fetch from network
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.warn('[SW] Cache-first failed for:', request.url, error);

    // Try to return stale cache as last resort
    const staleResponse = await caches.match(request);
    if (staleResponse) {
      return staleResponse;
    }

    // Return a fallback response
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/**
 * Network-first strategy: Try network, fall back to cache
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);

    // Cache successful GET responses
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.warn('[SW] Network-first falling back to cache for:', request.url);

    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // No cache either, return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }

    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/**
 * Message event - handle cache management commands
 */
self.addEventListener('message', (event) => {
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name.startsWith('millos-')) {
              console.log('[SW] Clearing cache:', name);
              return caches.delete(name);
            }
          })
        );
      }).then(() => {
        event.ports[0]?.postMessage({ success: true });
      })
    );
  }

  if (event.data.type === 'GET_CACHE_SIZE') {
    event.waitUntil(
      getCacheSize().then((sizes) => {
        event.ports[0]?.postMessage(sizes);
      })
    );
  }
});

/**
 * Calculate cache sizes for debugging
 */
async function getCacheSize() {
  const cacheNames = await caches.keys();
  const sizes = {};

  for (const name of cacheNames) {
    if (name.startsWith('millos-')) {
      const cache = await caches.open(name);
      const requests = await cache.keys();
      sizes[name] = {
        entries: requests.length,
        urls: requests.map((r) => r.url),
      };
    }
  }

  return sizes;
}
