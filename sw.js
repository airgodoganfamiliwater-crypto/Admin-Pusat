// sw.js — sengaja KOSONG dari sisi caching.
// Tujuannya cuma biar syarat "installable" PWA terpenuhi
// (browser butuh service worker aktif + ada listener fetch),
// tapi semua request tetap langsung ke network, gak ada yang disimpen.

self.addEventListener('install', () => {
  self.skipWaiting(); // langsung aktif, gak nunggu tab lama ditutup
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // sengaja dibiarin kosong, gak ada event.respondWith()
  // -> browser otomatis fallback ke fetch normal via network
});