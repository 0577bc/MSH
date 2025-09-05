self.addEventListener('install', event => {
    event.waitUntil(
        caches.open('signin-cache-v2').then(cache => {
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
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(name => name !== 'signin-cache-v2').map(name => caches.delete(name))
            );
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