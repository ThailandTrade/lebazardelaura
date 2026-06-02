import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Déploiement auto-hébergé : sortie autonome (server.js minimal) pour le VPS.
  output: "standalone",
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
