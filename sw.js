const CACHE_NAME = 'sanders-euralis-v1';
const ASSETS = [
  '/Reception/',
  '/Reception/index.html',
  '/Reception/manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  if(e.request.url.includes('supabase.co')) return;
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
