#!/usr/bin/env bash
# Build + (re)déploiement de l'app sur le VPS. À lancer depuis /opt/bazar.
#   ./deploy/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ git pull"
git pull --ff-only

echo "→ npm ci"
npm ci

# next build lit .env.local (donc les NEXT_PUBLIC_* sont injectés ici).
echo "→ build (output: standalone)"
npm run build

# Le serveur standalone n'embarque ni public/ ni .next/static : on les copie.
echo "→ copie des assets statiques dans le standalone"
cp -r public .next/standalone/
mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/

echo "→ redémarrage du service"
sudo systemctl restart bazar
sleep 1
systemctl --no-pager --lines=5 status bazar || true
echo "✓ Déployé."
