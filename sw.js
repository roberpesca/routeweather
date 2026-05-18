// RouteWeather Pro — Service Worker
var CACHE_NAME = 'rwp-v1';

// App shell files to cache on install
var SHELL_FILES = [
  '/routeweather-pro.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // CDN libraries (versioned, safe to cache long-term)
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,300;0,500;0,700;0,900;1,700&family=JetBrains+Mono:wght@400;500&display=swap'
];

// Install — cache app shell
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(SHELL_FILES);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Activate — clean up old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE_NAME; })
             .map(function(n) { return caches.delete(n); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch strategy:
// - API calls (open-meteo, strava): network only (live data)
// - App shell & CDN: cache-first, fallback to network
// - Everything else: network-first, fallback to cache
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Skip non-GET
  if (e.request.method !== 'GET') return;

  // API calls — always network, never cache
  if (url.indexOf('api.open-meteo.com') !== -1 ||
      url.indexOf('strava.com') !== -1 ||
      url.indexOf('render.com') !== -1) {
    return; // let browser handle normally
  }

  // Map tiles — cache with network fallback (tiles change rarely)
  if (url.indexOf('tile.openstreetmap.org') !== -1) {
    e.respondWith(
      caches.open(CACHE_NAME).then(function(cache) {
        return cache.match(e.request).then(function(cached) {
          if (cached) return cached;
          return fetch(e.request).then(function(resp) {
            if (resp.ok) cache.put(e.request, resp.clone());
            return resp;
          });
        });
      })
    );
    return;
  }

  // App shell & CDN — cache-first
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(resp) {
        // Cache successful responses for next time
        if (resp.ok) {
          var clone = resp.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return resp;
      });
    }).catch(function() {
      // Offline fallback — if requesting the main page, serve cached version
      if (e.request.mode === 'navigate') {
        return caches.match('/routeweather-pro.html');
      }
    })
  );
});
