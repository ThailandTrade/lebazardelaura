# État du projet & journal — Le bazar de Laura

> Document de reprise. Une nouvelle session Claude (ex. sur le VPS) doit le lire en
> entier pour savoir **où on en est** et **quoi faire**. Spéc produit : `CLAUDE.md`.
> Déploiement : `DEPLOYMENT.md`. Dernière mise à jour : 2026-06-05.

---

## 1. En deux phrases
Site vitrine (catalogue public, **sans paiement**) + **appli admin mobile** pour que
Laura catalogue son stock de livres français d'occasion à Bangkok en scannant les ISBN.
Tout est **auto-hébergé**, un seul projet Next.js + PostgreSQL.

**Prochaine étape = déploiement VPS** (voir `DEPLOYMENT.md`). Le code est sur GitHub :
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
- **Dump** prêt pour le VPS : `db/bazar_laura_dump.sql` (sur le laptop, **gitignored**).
  Le transférer (scp) et restaurer (voir DEPLOYMENT §2, option A) **préserve couvertures +
  quantités**.

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
- **Auth admin retirée** (demande utilisateur « on reste simple ») : `/admin` est **ouvert**.
  `next-auth`/`bcryptjs`/table `admin_users` restent en place pour réactiver facilement.
  → **En prod, `/admin` est accessible publiquement.** À sécuriser plus tard (réactiver
  Auth.js — il y avait `proxy.ts` + `auth.ts`, voir l'historique git, commit « Phase 3a ») ou
  au minimum restreindre par IP/Basic-Auth Caddy. **À décider avec l'utilisateur.**
- **PWA service worker désactivé** : `app/admin/sw-register.tsx` **désinscrit** le SW et purge
  les caches (il servait du HTML/JS périmé → erreurs d'hydratation pendant les tests).
  `public/sw.js` existe encore. → **Réactiver un SW propre pour l'installabilité** en prod
  (manifest `app/manifest.ts` est OK). Tâche post-déploiement.
- **Contact** : `NEXT_PUBLIC_WHATSAPP_NUMBER` / `NEXT_PUBLIC_LINE_ID` pas renseignés → le bloc
  contact affiche « bientôt disponible ». À remplir (rebuild requis car NEXT_PUBLIC).
- **Catégorisation du seed/import** parfois imparfaite (ex. un livre EN classé « autre »).
- **Sauvegardes** : à mettre en place (cron pg_dump + uploads).

---

## 10. Hébergement actuel (à migrer)
Pendant le dev/test, l'app tourne sur le **laptop** (`npm run dev` sur :3000) et est exposée
en HTTPS via un **tunnel cloudflared nommé** `laura-bazar`
(`tunnel id 831f79d5-...`, config `cloudflared/laura.yml`, CNAME `laura.glorytavern.world`
→ `...cfargotunnel.com`). C'est ce qui permet à Laura de tester le scan sur son téléphone
(la caméra exige HTTPS).
→ Au déploiement VPS : **couper ce tunnel** et repointer le DNS sur le VPS (DEPLOYMENT §8).
Le domaine `glorytavern.world` est géré sur **Cloudflare** (compte de l'utilisateur).

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
- `update-quantities.mjs` — restaure les quantités par ISBN (non destructif).
- `seed-demo.mjs` — jeu de démo (obsolète, remplacé par l'inventaire réel).
- `gen-icons.mjs` — régénère les icônes PWA (sharp).
- `create-admin.mjs` — crée un admin (pour quand l'auth sera réactivée).
Lancer avec `node --env-file=.env.local scripts/<x>.mjs`.

---

## 13. Quoi faire maintenant
1. Suivre **`DEPLOYMENT.md`** de bout en bout (DB → dump → env → build → systemd → Caddy → DNS).
2. Couper le tunnel laptop, repointer le DNS sur le VPS.
3. Tester le scan sur le téléphone de Laura (HTTPS prod).
4. Post-déploiement : réactiver un **SW PWA** propre, **sécuriser `/admin`**, renseigner les
   **contacts** WhatsApp/Line, mettre en place les **sauvegardes**.
