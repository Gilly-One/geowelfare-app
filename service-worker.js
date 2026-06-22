const CACHE_NAME = 'gmc-welfare-v1-0-3';
const CORE_ASSETS = [
  '/', '/index.html', '/offline.html', '/assets/css/styles.css',
  '/assets/img/icon-192.svg', '/assets/img/icon-512.svg', '/manifest.webmanifest'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then(res => res || caches.match('/offline.html'))));
});
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch(e) { data = {title:'GMC Welfare', body:event.data?.text() || 'New notification'}; }
  const title = data.title || 'GMC Welfare';
  const options = {
    body: data.body || 'You have a new update.',
    icon: '/assets/img/icon-192.svg',
    badge: '/assets/img/icon-192.svg',
    data: { url: data.url || '/member-portal.html' },
    tag: data.tag || 'gmc-welfare',
    renotify: true
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/index.html';
  event.waitUntil(clients.matchAll({type:'window', includeUncontrolled:true}).then(list => {
    for (const client of list) { if ('focus' in client) { client.navigate(url); return client.focus(); } }
    return clients.openWindow(url);
  }));
});
