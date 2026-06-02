"use client";

import { useEffect } from "react";

// Pendant la phase de test, on DÉSACTIVE le service worker : il servait du HTML/JS
// périmé (incohérences d'hydratation). On désinscrit tout SW et on purge les caches.
// Le SW (install PWA) sera réactivé proprement au moment du déploiement.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {});
    }
    if (typeof caches !== "undefined") {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
    }
  }, []);
  return null;
}
