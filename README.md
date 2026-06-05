# Le bazar de Laura

Site vitrine + appli d'inventaire pour une librairie française d'occasion à Bangkok.
Catalogue public **sans paiement** + appli admin mobile pour cataloguer en scannant les ISBN.
Auto-hébergé : un seul projet **Next.js 16** (App Router, standalone) + **PostgreSQL**.

## 📚 Documentation (à lire dans cet ordre)
- **[`docs/STATUS.md`](docs/STATUS.md)** — état du projet, décisions, données, pièges.
  **Point d'entrée pour reprendre le travail (y compris une nouvelle session Claude).**
- **[`DEPLOYMENT.md`](DEPLOYMENT.md)** — runbook de déploiement VPS (Caddy + systemd + Postgres)
  + section « Travailler sur le VPS » (dev/prod, RAM, Git).
- **[`deploy/GUI.md`](deploy/GUI.md)** — bureau graphique distant optionnel (XFCE + xRDP).
- **[`CLAUDE.md`](CLAUDE.md)** / **[`AGENTS.md`](AGENTS.md)** — spécification produit & règles.

## Démarrage (dev)
```bash
npm install
# créer .env.local (voir deploy/.env.production.example pour les variables)
npm run dev    # http://localhost:3000  (admin: /admin, scan: /admin/scan)
```
Base de données : voir `db/` (`00_bootstrap` → `01_schema` → `02_grants` → `03_quantity`) et
`docs/STATUS.md` §5.

## Structure
- `app/(site)/` — site public · `app/admin/` — appli admin · `app/api/` — routes serveur
- `lib/` — db, lookup ISBN, couvertures, constantes · `components/` — UI partagée
- `db/` — schéma SQL · `scripts/` — import/backfill/maintenance · `deploy/` — config prod
