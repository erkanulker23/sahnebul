/* Sahnebul — PWA kurulum (Ana ekrana ekle) için minimal service worker; ağ isteklerini olduğu gibi iletir. */
self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});
