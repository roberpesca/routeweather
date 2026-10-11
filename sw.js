// RouteWeather Pro — Service Worker v2
var CACHE_NAME = 'rwp-v3';   // new name: the old cache (which could hold users' route lists) is deleted on update

// Install — cache nothing upfront, let fetch handler populate cache on use
// This avoids issues with relative paths in service workers
self.addEventListener('install', function(e) {
  self.skipWaiting();
});

// Activate — clean up old caches, take control immediately
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
// - API calls (open-meteo, strava, our backend, overpass): network only, never saved on the device
// - Map tiles: cache-first (tiles change rarely)
// - App shell, CDN libs, fonts: network-first with cache fallback
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Skip non-GET
  if (e.request.method !== 'GET') return;

  // API calls — always network, never cache
  if (url.indexOf('api.open-meteo.com') !== -1 ||
      url.indexOf('strava.com') !== -1 ||
      url.indexOf('render.com') !== -1 ||
      url.indexOf('railway.app') !== -1 ||
      url.indexOf('/api/strava/') !== -1 ||
      url.indexOf('/auth/strava') !== -1 ||
      url.indexOf('overpass') !== -1 ||
      url.indexOf('ensemble-api') !== -1) {
    return; // let browser handle normally
  }

  // Map tiles — cache-first (they rarely change)
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

  // Everything else — network-first, cache fallback
  e.respondWith(
    fetch(e.request).then(function(resp) {
      // Cache successful responses for offline use
      if (resp.ok) {
        var clone = resp.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(e.request, clone);
        });
      }
      return resp;
    }).catch(function() {
      return caches.match(e.request);
    })
  );
});
