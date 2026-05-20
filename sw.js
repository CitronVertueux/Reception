const CACHE_NAME = 'sanders-euralis-v2';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  if(e.request.url.includes('supabase.co')) return;
  if(e.request.url.includes('googleapis.com')) return;
  if(e.request.url.includes('cdnjs.cloudflare.com')) return;
  if(e.request.url.includes('jsdelivr.net')) return;
});
