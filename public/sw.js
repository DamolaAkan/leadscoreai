// LeadScoreAI installable app: minimal service worker. It never caches app data
// (so nobody sees stale leads); it only shows a friendly page when a screen is
// opened with no internet.
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open("lsai-offline-v1").then((c) => c.add(OFFLINE_URL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return; // everything else: straight to the network
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
});
