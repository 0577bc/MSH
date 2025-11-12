/**
 * 服务工作者 (service-worker.js)
 * 功能：提供离线缓存和PWA支持，提升应用性能和用户体验
 * 作者：MSH系统
 * 版本：2.0
 * 
 * 特性：
 * - 静态资源缓存
 * - 离线访问支持
 * - 网络请求拦截
 * - 缓存策略管理
 */

// ==================== 安装事件 ====================
self.addEventListener('install', event => {
  event.waitUntil(
      caches.open('signin-cache').then(cache => {
          return cache.addAll([
              '/index.html',
              '/admin.html',
              '/daily-report.html',
              '/summary.html',
              '/personal-page.html',
              '/attendance-records.html',
              '/delete-management.html',
              '/firebase-monitor.html',
              '/src/admin.js',
              '/src/daily-report.js',
              '/src/main.js',
              '/src/summary.js',
              '/src/attendance-records.js',
              '/src/new-data-manager.js',
              '/src/utils.js',
              '/src/config-manager.js',
              '/src/csrf-protection.js',
              '/src/cache-manager.js',
              '/src/performance-monitor.js',
              '/src/security.js',
              '/src/style.css',
              '/config.js',
              '/manifest.json',
              '/favicon.ico'
          ]);
      })
  );
});

// ==================== 网络请求拦截 ====================
self.addEventListener('fetch', event => {
  event.respondWith(
      caches.match(event.request).then(response => {
          return response || fetch(event.request);
      })
  );
});