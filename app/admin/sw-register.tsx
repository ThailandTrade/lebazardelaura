"use client";

import { useEffect } from "react";

// Enregistre le service worker (installabilité PWA + coque hors-ligne).
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    }
  }, []);
  return null;
}
