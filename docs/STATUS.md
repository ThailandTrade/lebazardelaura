# État du projet & journal — Le bazar de Laura

> Document de reprise. Une nouvelle session Claude (ex. sur le VPS) doit le lire en
> entier pour savoir **où on en est** et **quoi faire**. Spéc produit : `CLAUDE.md`.
> Déploiement : `DEPLOYMENT.md`. Dernière mise à jour : 2026-06-05.

---

## 1. En deux phrases
Site vitrine (catalogue public, **sans paiement**) + **appli admin mobile** pour que
Laura catalogue son stock de livres français d'occasion à Bangkok en scannant les ISBN.
Tout est **auto-hébergé**, un seul projet Next.js + PostgreSQL.

**✅ DÉPLOYÉ EN PROD** (2026-06-05) sur **https://lebazardelaura.com** (VPS Contabo,
IP `62.146.237.130`). Reste le post-déploiement (§9 / §13). Code sur GitHub :
`https://github.com/ThailandTrade/lebazardelaura` (branche `main`).

---

## 2. Ce qui marche (état actuel)
- **Public** : accueil (hero + dessin fait main + mot de Laura + derniers arrivages),
  `/catalogue` (filtres catégorie / prix / recherche), `/livre/[id]` (fiche + contact
  WhatsApp/Line + ISBN + « plusieurs exemplaires »), `/a-propos`. Design « librairie
  indépendante » (papier crème, accent terracotta, serif Fraunces).
- **Admin** (`/admin`, **sans authentification** — voir §9) : coque type app (barre haute
  + onglets bas Stock/Scanner), PWA scaffold.
  - **Scan** (`/admin/scan`) : caméra `@zxing/browser` → lookup ISBN → formulaire
    pré-rempli ; détection de **doublon** (déjà en stock → éditer) ; saisie ISBN manuelle ;
    ajout sans ISBN ; retour haptique + bip.
  - **Formulaire** : prix rapides (80/120/150/180/230), catégorie/état/statut,
    **quantité**, upload photo de couverture, **sélecteur de couverture** (voir §7).
  - **Tableau de bord** : liste, recherche, filtres par statut, changement de statut +
    **réglage quantité −/+** en un tap.
- **API** : `/api/isbn/[isbn]` (lookup), `/api/books/by-isbn/[isbn]` (doublon + lookup),
  `/api/covers/[isbn]` (couvertures candidates), `/api/upload` (POST photo),
  `/uploads/covers/[file]` (sert les uploads).

---

## 3. Stack & versions
- **Next.js 16.2.7** (App Router, Turbopack, `output: 'standalone'`), **React 19.2.4**.
- **Node 22** (min 20.9). **PostgreSQL** (laptop: port **5433** ; VPS: 5432).
- Accès DB : **`pg`** (node-postgres), pool partagé `lib/db.ts`, requêtes paramétrées.
- Scan : `@zxing/browser` + `@zxing/library`. Icônes PWA : `sharp` (dev).
- Tailwind v4. `next-auth@beta` et `bcryptjs` sont installés mais **inutilisés** (auth retirée).

---

## 4. ⚠️ Next.js 16 — différences vs versions antérieures (À CONNAÎTRE avant de coder)
`AGENTS.md` impose de lire `node_modules/next/dist/docs/` avant d'écrire du code Next.
Points qui nous ont déjà piégés :
- **`middleware` → `proxy`** : le fichier s'appellerait `proxy.ts` et tourne en **runtime
  Node** (plus d'edge). (On n'a PAS de proxy actuellement, l'auth a été retirée.)
- **`params` / `searchParams` sont des Promises** → `const { id } = await params`.
- **`output: 'standalone'`** : le build ne copie pas `public/` ni `.next/static` dans
  `.next/standalone` → il faut les **copier à la main** (fait par `deploy/deploy.sh`).
- **Turbopack par défaut** ; `next lint` supprimé (on lint via `eslint` direct).
- **`images.domains` déprécié** → `remotePatterns` (on utilise des `<img>` simples pour
  les couvertures, donc pas concerné).
- **`reactStrictMode: false`** (dans `next.config.ts`) : le double-montage de StrictMode en
  dev **cassait le flux caméra** du scanner. Laisser désactivé.
- **`allowedDevOrigins`** contient `laura.glorytavern.world` (pour le dev via tunnel).
- Règles ESLint react-hooks strictes (`set-state-in-effect`, `refs`) — voir `barcode-scanner.tsx`.

---

## 5. Base de données
- Base **`bazar_laura`**, rôle applicatif **`bazar_app`** (DML uniquement, tables owned by
  postgres). Schéma : `db/01_schema.sql` (+ `03_quantity.sql`, intégré à 01), droits
  `db/02_grants.sql`, bootstrap rôle `db/00_bootstrap.sql`.
- Table `books` : métadonnées + `category`/`condition`/`status` (enums) + `price` (THB) +
  **`quantity`** + `notes` (interne) + `source`. `admin_users` existe (auth retirée, inutilisée).
- **Données actuelles** : **734 livres** (statut `disponible`), **678 avec couverture (92%)**,
  **17 en quantité > 1** (quantités réelles restaurées depuis l'inventaire ; les très gros
  stocks sans ISBN sont à régler à la main). Vue publique = `status in (disponible,reserve)`
  **et** `quantity > 0`, jamais `notes`.
- **Déploiement = base VIDE** (décision utilisateur, 2026-06-05). On NE transfère PAS la base ;
  Laura cataloguera depuis l'admin sur le VPS (couvertures rapatriées/optimisées
  automatiquement). Un dump existe sur le laptop (`db/bazar_laura_dump.sql`, gitignored) mais
  ne sera pas utilisé. Réimport possible via les scripts si on copie `Inventaire.tsv` (DEPLOYMENT §2, optionnel).

---

## 6. Métadonnées ISBN (cascade de lookup)
`lib/isbn.ts` → `/api/isbn/[isbn]`. Cascade, premier succès gagne :
1. **Google Books** (`q=isbn:`) — **nécessite `GOOGLE_BOOKS_API_KEY`** (sinon **429**
   « quota partagé »). Avec clé : couverture FR quasi totale, rapide, fiable. **La clé est
   configurée** (dans `.env.local` du laptop ; à reporter sur le VPS). Quota 1000/jour =
   largement suffisant pour scanner.
2. **BnF** (SRU / UNIMARC, `lib/isbn.ts`) — filet FR (dépôt légal). Interroge l'ISBN-13
   **puis l'ISBN-10** (la BnF indexe l'ISBN imprimé). **Capricieuse** : timeouts/throttling,
   et **bloque l'IP si on la martèle** (constaté). Un retry est en place.
3. **Open Library** — faible sur le FR.

---

## 7. Couvertures (très important — beaucoup de travail ici)
Deux usages : enrichissement auto + sélecteur manuel.
- **`lib/covers.ts`** → `/api/covers/[isbn]` agrège des **candidates** depuis :
  **Dilicom/epagine** (`images.epagine.fr/<3 derniers>/<ean>_1_75.jpg`, **sans clé ni
  quota**, excellent FR ; placeholder = PNG 2687o → on **exige un JPEG**), **BnF** (ARK),
  **Google Books** (API si clé + Dynamic Links), **Google Custom Search images** (si
  `GOOGLE_CSE_ID` — désactivé, quota 100/j).
- **`CoverPicker`** (formulaire) : bouton « Chercher une couverture » → vignettes cliquables
  + **bouton Google Images** (recherche par ISBN, ouvrir + coller l'URL ; pas d'API légale
  pour scraper Google Images) + champ « coller une URL ».
- **Backfill** : `scripts/backfill-covers.mjs` (epagine → Google → BnF → OL search). C'est ce
  qui a porté la couverture du catalogue de ~54% à **92%**. **À relancer après import** sur
  le VPS si on reconstruit (option B).
- Esprit du projet : la **photo réelle** prise par Laura prime sur l'image d'API.
- **Optimisation stockage/affichage** (`lib/images.ts`, `sharp` = dépendance prod) : à
  l'enregistrement, toute couverture **externe est rapatriée en local** et convertie en
  **WebP ~600px (~40 Ko)** ; les **photos uploadées** sont aussi redimensionnées en WebP.
  → plus de hotlink lent, images servies depuis notre serveur (Caddy, cache `immutable`).
  Script de masse : `scripts/localize-covers.mjs` (déjà appliqué sur le laptop : 678/678 → ~41 Ko).
  Fallback : si le rapatriement échoue, on garde l'URL externe.

---

## 8. Secrets & variables d'environnement
- Modèle prod : `deploy/.env.production.example`. Sur le VPS → `/opt/bazar/.env.local`.
- **Jamais committés** (gitignore) : `.env`, `.env.local`, `Inventaire.tsv`,
  `db/bazar_laura_dump.sql`, `cloudflared/`.
- Valeurs sensibles (mot de passe `bazar_app`, `GOOGLE_BOOKS_API_KEY`) : dans le `.env.local`
  du **laptop**. Les reporter manuellement sur le VPS (ne PAS les mettre dans le repo).
- `GOOGLE_SEARCH_API_KEY` / `GOOGLE_CSE_ID` : optionnels, laissés vides (quota trop bas).

---

## 9. Décisions & TODO (ce qui n'est PAS fait)
- **Auth admin applicative retirée** (« on reste simple ») : pas de login dans l'app.
  `next-auth`/`bcryptjs`/table `admin_users` restent en place pour réactiver si besoin.
  → **En prod, `/admin` + `/api/*` sont protégés par Basic-Auth Caddy** (voir §13.1). Le
  site public reste ouvert. (Réactiver Auth.js reste une option future, commit « Phase 3a ».)
- **PWA service worker désactivé** : `app/admin/sw-register.tsx` **désinscrit** le SW et purge
  les caches (il servait du HTML/JS périmé → erreurs d'hydratation pendant les tests).
  `public/sw.js` existe encore. → **Réactiver un SW propre pour l'installabilité** en prod
  (manifest `app/manifest.ts` est OK). Tâche post-déploiement.
- **Contact** : `NEXT_PUBLIC_WHATSAPP_NUMBER` / `NEXT_PUBLIC_LINE_ID` pas renseignés → le bloc
  contact affiche « bientôt disponible ». À remplir (rebuild requis car NEXT_PUBLIC).
- **Catégorisation du seed/import** parfois imparfaite (ex. un livre EN classé « autre »).
- **Sauvegardes** : à mettre en place (cron pg_dump + uploads).

---

## 10. Hébergement (PROD ACTIVE sur le VPS)
**La prod tourne sur le VPS Contabo** (Ubuntu 24.04, 12 Go RAM, IP `62.146.237.130`) :
- App : Next.js standalone lancé par **systemd** (`/etc/systemd/system/bazar.service`,
  `User=manu`, `WorkingDirectory=/home/manu/lebazardelaura`, `EnvironmentFile=.env.local`,
  `node .next/standalone/server.js` sur `127.0.0.1:3000`). Enable au boot, ~46 Mo RAM.
- Reverse proxy + HTTPS : **Caddy** (`/etc/caddy/Caddyfile`), Let's Encrypt auto pour
  `lebazardelaura.com` (+ `www` → 301 vers apex). Caddy reverse-proxy tout vers :3000 ;
  l'app sert elle-même `/uploads` (caddy ne peut pas lire `/home/manu`).
- DB : **PostgreSQL 16** local (port **5432**), base `bazar_laura`, rôle `bazar_app`.
- DNS : **Cloudflare**, domaine `lebazardelaura.com`, A apex + www → IP du VPS en
  **DNS only** (gris). Zone ID `b5d7ee0ece97c8fdedd2d5232234baa5`. Géré via un token API
  Cloudflare fourni par l'utilisateur (à révoquer après usage — non stocké dans le repo).

> ⚠️ `sudo` sans mot de passe a été activé temporairement (`/etc/sudoers.d/manu`) le temps
> du déploiement → **à retirer** (`sudo rm /etc/sudoers.d/manu`) une fois le post-déploiement
> fini.

> Ancien hébergement de TEST (obsolète) : app sur le **laptop** via tunnel cloudflared
> `laura-bazar` → `laura.glorytavern.world`. À couper/supprimer côté laptop si ce n'est pas
> déjà fait (il ne sert plus).

---

## 11. Pièges rencontrés (mémoire)
- **BnF bloque l'IP** si requêtée trop vite (bulk) → accès « poli » (faible concurrence +
  délai) dans `backfill-covers.mjs` ; pour le scan unitaire (1 req) aucun risque.
- **Google Books sans clé = 429** (quota anonyme partagé épuisé). → clé indispensable.
- **epagine** : placeholder « pas de couverture » = **PNG 2687 octets** → filtrer en
  exigeant un `image/jpeg`.
- **Caméra** : exige un **contexte sécurisé** (HTTPS ou localhost). En http via IP LAN → bloquée.
- **`cd` dans l'outil Bash persiste** entre commandes (sous Windows) — vérifier le cwd.
- **Captures Chrome headless** : `--window-size=390` peut rendre en ~484px et « couper » la
  capture → faux positif de débordement. Mesurer `scrollWidth` avant de conclure.
- Warnings **LF→CRLF** au commit (Windows) : bénins.

---

## 12. Scripts (`scripts/`)
- `import-inventory.mjs` — purge + import depuis `Inventaire.tsv` (gère quantité). `--dry`, `--reset`.
- `backfill-covers.mjs` — complète les couvertures manquantes (epagine→Google→BnF→OL).
  Options `--concurrency` / `--delay`.
- `localize-covers.mjs` — rapatrie en masse les couvertures externes en WebP local optimisé.
- `update-quantities.mjs` — restaure les quantités par ISBN (non destructif).
- `seed-demo.mjs` — jeu de démo (obsolète, remplacé par l'inventaire réel).
- `gen-icons.mjs` — régénère les icônes PWA (sharp).
- `create-admin.mjs` — crée un admin (pour quand l'auth sera réactivée).
Lancer avec `node --env-file=.env.local scripts/<x>.mjs`.

---

## 13. Quoi faire maintenant
> Décision : on **migre le travail sur le VPS** (Contabo, 12 Go RAM). Le dev se fera là-bas.
> Workflow dev/prod + RAM + Git : **`DEPLOYMENT.md` §10**. Bureau graphique optionnel
> (XFCE+xRDP) : **`deploy/GUI.md`**.
>
> 🚩 **Domaine** : le déploiement se fera sur un **vrai domaine de production** (pas
> forcément `laura.glorytavern.world`, qui n'était que l'URL de test via tunnel).
> **Au moment du déploiement, DEMANDER à l'utilisateur** : le domaine final exact, où sont
> gérés les DNS + l'accès/token nécessaire, si c'est proxifié Cloudflare, et l'IP du VPS.
> Puis remplacer partout `laura.glorytavern.world`. (Détails : `DEPLOYMENT.md`, encart en tête.)

**✅ FAIT (2026-06-05)** : déploiement complet sur le VPS (install Node22/PG16/Caddy → DB
vide → schéma → `.env.local` → build standalone → service systemd → Caddy + DNS Cloudflare
→ HTTPS live sur `lebazardelaura.com`).

**Reste à faire (post-déploiement)** :
1. ✅ **`/admin` SÉCURISÉ** (2026-06-05) par **Basic-Auth Caddy** : `@protected path /admin*
   /api/*` → `basic_auth` (user `laura`, hash bcrypt dans `/etc/caddy/Caddyfile`, **pas
   committé**). Public reste ouvert. Le mot de passe a été transmis à l'utilisateur ; pour le
   changer : `caddy hash-password --plaintext 'X'` puis remplacer le hash + `reload caddy`.
   (Alternative future : réactiver Auth.js, commit « Phase 3a ».)
2. **Contacts** WhatsApp/Line : renseigner `NEXT_PUBLIC_WHATSAPP_NUMBER` / `NEXT_PUBLIC_LINE_ID`
   dans `.env.local` puis **rebuild** (`./deploy/deploy.sh`).
3. **Tester le scan** sur le téléphone de Laura (HTTPS prod OK → caméra autorisée).
4. **SW PWA** propre (installabilité) — voir §9.
5. **Sauvegardes** : cron `pg_dump` + uploads (DEPLOYMENT §9).
6. **Ménage** : retirer le `sudo` NOPASSWD (`sudo rm /etc/sudoers.d/manu`), révoquer le token
   Cloudflare, couper l'ancien tunnel laptop.
