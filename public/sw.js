// Service worker minimal pour l'installabilité PWA.
// IMPORTANT : on n'intercepte PAS les navigations — mettre en cache le HTML d'une
// app Next rendue côté serveur provoque des incohérences d'hydratation entre builds.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Purge tout cache hérité (ancienne version qui mettait le HTML en cache).
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

// Handler présent (requis pour l'installabilité) mais en simple passthrough réseau.
self.addEventListener("fetch", () => {});
