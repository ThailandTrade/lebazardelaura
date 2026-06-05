# Déploiement VPS — Le bazar de Laura

> Runbook complet pour mettre l'app en production sur un VPS (Ubuntu/Debian).
> Lis d'abord **`docs/STATUS.md`** (état du projet, décisions, pièges).
> Spéc produit : **`CLAUDE.md`** / **`AGENTS.md`**.

Cible : `https://laura.glorytavern.world` servi par **Caddy** (HTTPS auto) →
app **Next.js standalone** (`server.js` sur `:3000`) → **PostgreSQL local**.
Un seul process Node, pas de Docker, pas de serverless.

---

## 0. Pré-requis sur le VPS

```bash
# Node 22 (le projet exige Node 20.9+ ; on est sur 22)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git postgresql caddy
node -v   # doit afficher v22.x
```
> `sharp` (génération d'icônes, devDependency) peut nécessiter `build-essential` ;
> en pratique le binaire prébuild suffit sur x64.

Crée l'utilisateur de service et le dossier app :
```bash
sudo useradd --system --create-home --home-dir /opt/bazar --shell /usr/sbin/nologin bazar || true
sudo mkdir -p /opt/bazar && sudo chown bazar:bazar /opt/bazar
```

---

## 1. Récupérer le code

```bash
sudo -u bazar git clone https://github.com/ThailandTrade/lebazardelaura.git /opt/bazar
cd /opt/bazar
```
Le repo NE contient PAS : `.env*` (secrets), `Inventaire.tsv` (données), le dump SQL,
`cloudflared/`. Ils se transfèrent à la main (étapes 3 et 4).

---

## 2. Base de données PostgreSQL

```bash
# 2.1 Rôle applicatif (édite le mot de passe dans le fichier d'abord !)
sudo -u postgres psql -f /opt/bazar/db/00_bootstrap.sql
# … ou directement :
sudo -u postgres psql -c "create role bazar_app login password 'MOTDEPASSE_FORT';"

# 2.2 Base dédiée + droit de connexion
sudo -u postgres createdb -O postgres bazar_laura
sudo -u postgres psql -d postgres -c "grant connect on database bazar_laura to bazar_app;"
```

Puis **le schéma** (décision : on démarre sur une **base vide**, Laura cataloguera depuis
l'admin — les couvertures sont rapatriées/optimisées automatiquement à l'enregistrement) :
```bash
sudo -u postgres psql -d bazar_laura -f /opt/bazar/db/01_schema.sql   # inclut déjà 'quantity'
sudo -u postgres psql -d bazar_laura -f /opt/bazar/db/02_grants.sql
```

> **Optionnel** — réimporter l'inventaire de départ (si tu copies `Inventaire.tsv` dans
> `/opt/bazar/`, après avoir préparé `.env.local`) :
> ```bash
> sudo -u bazar bash -c 'cd /opt/bazar && node --env-file=.env.local scripts/import-inventory.mjs'
> sudo -u bazar bash -c 'cd /opt/bazar && node --env-file=.env.local scripts/backfill-covers.mjs'
> sudo -u bazar bash -c 'cd /opt/bazar && node --env-file=.env.local scripts/update-quantities.mjs'
> sudo -u bazar bash -c 'cd /opt/bazar && node --env-file=.env.local scripts/localize-covers.mjs'  # WebP local
> ```

---

## 3. Variables d'environnement

```bash
sudo -u bazar cp /opt/bazar/deploy/.env.production.example /opt/bazar/.env.local
sudo -u bazar nano /opt/bazar/.env.local
```
À renseigner :
- `DATABASE_URL` → `postgres://bazar_app:MOTDEPASSE_FORT@127.0.0.1:5432/bazar_laura`
- `GOOGLE_BOOKS_API_KEY` → la clé (cf. `docs/STATUS.md`, elle est dans le `.env.local` du laptop)
- `UPLOAD_DIR=/opt/bazar/uploads/covers` (chemin **absolu**)
- `NEXT_PUBLIC_WHATSAPP_NUMBER`, `NEXT_PUBLIC_LINE_ID` (si connus — sinon vides, le bloc contact s'adapte)

> ⚠️ Les `NEXT_PUBLIC_*` sont **gelés au build**. Si tu les changes, il faut **rebuild**.

```bash
sudo -u bazar mkdir -p /opt/bazar/uploads/covers
```

---

## 4. Build

```bash
cd /opt/bazar
sudo -u bazar npm ci
sudo -u bazar npm run build          # output: standalone (next.config.ts)
# le standalone n'embarque pas public/ ni .next/static :
sudo -u bazar cp -r public .next/standalone/
sudo -u bazar cp -r .next/static .next/standalone/.next/
```
> Le script `deploy/deploy.sh` automatise pull + build + copie + restart pour les MAJ.

---

## 5. Service systemd

```bash
sudo cp /opt/bazar/deploy/bazar.service /etc/systemd/system/bazar.service
sudo systemctl daemon-reload
sudo systemctl enable --now bazar
journalctl -u bazar -n 30 --no-pager     # vérifier "Ready"
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/admin   # 200 attendu
```

---

## 6. DNS + Caddy (HTTPS)

1. **DNS Cloudflare** : enregistrement **A** `laura` → IP du VPS, en **« DNS only »**
   (nuage **gris**). Si proxifié (orange), le challenge HTTP de Caddy échoue.
   > Aujourd'hui ce sous-domaine est routé vers le laptop par un tunnel cloudflared
   > (`laura-bazar`). **Avant** de basculer : voir étape 8 (couper le tunnel).

2. **Caddy** :
```bash
sudo cp /opt/bazar/deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
journalctl -u caddy -n 30 --no-pager
```
3. Test : `https://laura.glorytavern.world/admin` (200), `/catalogue`, une fiche livre,
   et une couverture uploadée `/uploads/covers/...`.

---

## 7. Permissions uploads

L'app **écrit** les photos dans `UPLOAD_DIR` et **Caddy les sert** depuis `/opt/bazar/uploads`.
Assure-toi que `bazar` possède le dossier :
```bash
sudo chown -R bazar:bazar /opt/bazar/uploads
```

---

## 8. Basculer depuis le tunnel laptop

Tant que le tunnel `laura-bazar` (sur le laptop) tourne, le DNS Cloudflare route vers le
laptop. Pour passer au VPS :
- Sur le **laptop** : arrête le tunnel (`cloudflared` process) et supprime le routage :
  `cloudflared tunnel delete laura-bazar` (après avoir stoppé le process).
- Dans **Cloudflare DNS** : remplace le CNAME `laura` (→ ...cfargotunnel.com) par un **A**
  vers l'IP du VPS, en **DNS only**.
- Laisse Caddy obtenir le certificat (étape 6).

> Détails du tunnel actuel dans `docs/STATUS.md`.

---

## 9. Sauvegardes (à faire)

```bash
# Cron quotidien : dump compressé + rétention 14 jours
sudo -u postgres bash -c 'pg_dump bazar_laura | gzip > /var/backups/bazar_$(date +\%F).sql.gz'
# + sauvegarder /opt/bazar/uploads (rsync/restic)
```

---

## 10. Mises à jour

```bash
cd /opt/bazar && sudo -u bazar ./deploy/deploy.sh
```

---

## Checklist finale
- [ ] `systemctl status bazar` actif, `journalctl -u bazar` "Ready"
- [ ] `https://laura.glorytavern.world/` , `/catalogue`, `/livre/<id>`, `/admin`, `/admin/scan` → 200
- [ ] Scan caméra OK sur un vrai téléphone (HTTPS requis — voir STATUS, SW à réactiver)
- [ ] Couverture uploadée visible via `/uploads/covers/...`
- [ ] Lookup ISBN renvoie `source: google_books`
- [ ] Tunnel laptop coupé, DNS pointe sur le VPS
- [ ] Sauvegardes en place
