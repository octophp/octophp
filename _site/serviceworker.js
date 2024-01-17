var CACHE_VERSION = "1705504992";
var CACHE_NAME = 'octophp';
var CACHE = CACHE_NAME + '-v' + CACHE_VERSION;
var PATH_TO_IGNORE = [];

// Pages to cache
var urlsToCache = [];
urlsToCache.push('http://localhost:8000/');
urlsToCache.push('http://localhost:8000/404.html');
urlsToCache.push('http://localhost:8000/docs/');
urlsToCache.push('http://localhost:8000/docs/installation/configure-the-software/');
urlsToCache.push('http://localhost:8000/docs/installation/setup-application/');
urlsToCache.push('http://localhost:8000/docs/introduction/getting-started/');
urlsToCache.push('http://localhost:8000/docs/reference/reference/');
urlsToCache.push('http://localhost:8000/docs/troubleshooting/faq/');
urlsToCache.push('http://localhost:8000/docs/user-guides/api-management/');
urlsToCache.push('http://localhost:8000/docs/user-guides/customer-management/');
urlsToCache.push('http://localhost:8000/docs/user-guides/product-management/');
urlsToCache.push('http://localhost:8000/docs/user-guides/project-structure/');
urlsToCache.push('http://localhost:8000/docs/user-guides/services/');
urlsToCache.push('http://localhost:8000/docs/user-guides/settings/');
urlsToCache.push('http://localhost:8000/docs/user-guides/user-management/');
urlsToCache.push('http://localhost:8000/manifest.webmanifest');
urlsToCache.push('http://localhost:8000/robots.txt');
urlsToCache.push('http://localhost:8000/sitemap.xml');
urlsToCache.push('http://localhost:8000/xsl/atom.xsl');
// Files to cache
// Pre-cache pages/files
self.addEventListener('install', function(event) {
  self.skipWaiting(); // install the new SW immediately
  event.waitUntil(
    caches.open(CACHE).then(function(cache) {
      urlsToCache.forEach(function (url) {
        cache.add(url).catch(error => console.error(`[SW] Can't add "${url}" to cache`));
      });
    })
  );
});

// Remove old cache
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keyList) {
      return Promise.all(keyList.map(function(key) {
        // New version?
        if (key !== CACHE) {
          // Flush cache
          return caches.delete(key);
        }
      }));
    })
  );
});

// Fetch data
self.addEventListener('fetch', function(event) {
  url = new URL(event.request.url);
  // Ignore non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  // Ignore non-local resources (except images)
  if (!(url.origin == location.origin) && event.request.headers.get('Accept').indexOf('image') === -1) {
    return;
  }
  // Ignore Cecil's watcher
  if (url.pathname == '/watcher') {
    return;
  }
  // Ignore some paths (optional)
  try {
    PATH_TO_IGNORE.forEach(function (path) {
      if (url.pathname.startsWith(path)) {
        throw new Error('[SW] Path "' + path + '" ignored');
      }
    });
  } catch (e) {
    return;
  }
  // Fetch
  event.respondWith(
    caches.match(event.request).then(function(response) {
      // Return response from cache if exists
      if (response) {
        return response;
      }
      // Store visited ressource to cache
      var fetchRequest = event.request.clone();
      return fetch(fetchRequest).then(function(response) {
        // Ignore non-valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        var responseToCache = response.clone();
        caches.open(CACHE).then(function(cache) {
          // Ignore non-HTTP protocols ("data:", "chrome-extension:, etc.)
          if (!event.request.url.startsWith('http')) {
            return;
          }
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(function(response) {
        // Offline image
        if (event.request.headers.get('Accept').indexOf('image') !== -1) {
          return new Response('<svg role="img" aria-labelledby="offline-title" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><title id="offline-title">Offline</title><g fill="none" fill-rule="evenodd"><path fill="#D8D8D8" d="M0 0h400v300H0z"/><text fill="#505050" font-family="Helvetica Neue,Arial,Helvetica,sans-serif" font-size="72" font-style="italic"><tspan x="57" y="172">Offline</tspan></text></g></svg>', { headers: { 'Content-Type': 'image/svg+xml' } });
        }
      });
    })
  );
});

// Notification click
self.addEventListener('notificationclick', function (event) {
  const clickedNotification = event.notification;
  clickedNotification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientsArr) => {
      const hadWindowToFocus = clientsArr.some((windowClient) =>
        windowClient.url.startsWith('http://localhost:8000/') ? (windowClient.focus(), true) : false);
      if (!hadWindowToFocus) {
        clients.openWindow('http://localhost:8000/')
          .then((windowClient) => (windowClient ? windowClient.focus() : null));
      }
    })
  );
});