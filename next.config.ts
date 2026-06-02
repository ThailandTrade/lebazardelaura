import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Déploiement auto-hébergé : sortie autonome (server.js minimal) pour le VPS.
  output: "standalone",
};

export default nextConfig;
