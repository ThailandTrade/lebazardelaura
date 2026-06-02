import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Déploiement auto-hébergé : sortie autonome (server.js minimal) pour le VPS.
  output: "standalone",
  // Domaine utilisé en dev via le tunnel Cloudflare (requêtes RSC/actions cross-origin).
  allowedDevOrigins: ["laura.glorytavern.world"],
  // StrictMode démonte/remonte les effets en dev, ce qui casse le flux caméra du scanner.
  reactStrictMode: false,
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
