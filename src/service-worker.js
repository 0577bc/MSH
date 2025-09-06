self.addEventListener('install', event => {
  event.waitUntil(
      caches.open('signin-cache').then(cache => {
          return cache.addAll([
              '/index.html',
              '/admin.html',
              '/daily-report.html',
              '/summary.html',
              '/src/admin.js',
              '/src/daily-report.js',
              '/src/main.js',
              '/src/summary.js',
              '/src/style.css',
              '/manifest.json'
          ]);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
      caches.match(event.request).then(response => {
          return response || fetch(event.request);
      })
  );
});