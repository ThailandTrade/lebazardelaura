# Le bazar de Laura — Site vitrine + appli d'inventaire

> Spécifications pour Claude Code. Ce projet est un **site vitrine** (façade) pour une librairie
> française d'occasion mobile à Bangkok, **sans paiement en ligne**, doublé d'une **PWA d'admin**
> permettant à Laura de cataloguer le stock en scannant les ISBN.
>
> **Hébergement : auto-hébergé.** En dev sur le laptop ; à terme tout tourne sur un VPS unique
> qui héberge aussi le PostgreSQL. Pas de service managé, pas de serverless.

---

## 1. Contexte

Le bazar de Laura vend des livres français d'occasion sur des marchés et événements à Bangkok.
On veut mettre la collection en ligne pour la rendre visible et donner envie, **pas pour vendre
directement**. Les vraies ventes se concluent par message (WhatsApp / Line) avec Laura.

Deux publics :
1. **Les visiteurs** — parcourent un beau catalogue, filtrent, et contactent Laura pour acheter.
2. **Laura (admin)** — ajoute / met à jour le stock depuis son téléphone en scannant les codes-barres.

---

## 2. Objectifs et non-objectifs

### Objectifs
- Catalogue en ligne agréable, qui donne l'image d'un projet fait **avec soin** (pas un template générique, pas un truc bâclé).
- Ajout d'un livre en **< 30 secondes** : scan → infos auto-remplies → prix/catégorie/état → valider.
- Récupération **automatique** des métadonnées à partir de l'ISBN.
- Contact en 1 clic vers Laura (WhatsApp / Line) avec le livre déjà mentionné dans le message.

### Non-objectifs (volontairement exclus)
- ❌ Pas de paiement en ligne, pas de panier, pas de checkout.
- ❌ Pas de comptes clients / inscription visiteur.
- ❌ Pas de gestion d'expédition / logistique dans le site.
- ❌ Pas de multi-vendeur. Une seule admin (Laura).

---

## 3. Direction artistique : « bon site amateur, mais pas cheap »

L'esprit recherché : **une librairie indépendante tenue par quelqu'un qui aime les livres**.
Chaleureux, soigné, un peu personnel — surtout pas une vitrine SaaS corporate, ni un Bootstrap par défaut.

À faire :
- Fond papier / crème chaud, **une** couleur d'accent affirmée (encre profonde, terracotta ou bordeaux).
- Titres en **serif littéraire** avec du caractère, corps de texte en sans-serif propre et lisible.
- Beaucoup d'air, grille de cartes-livres avec les couvertures bien mises en valeur, espacements réguliers.
- Touches personnelles : un petit mot de Laura, des photos du stand au marché, un logo / doodle fait main.

À éviter :
- Dégradés violet/bleu génériques « startup », ombres portées partout, emojis à gogo.
- Times New Roman brut (trop cheap), ou au contraire un design ultra-léché qui sonne faux.
- Le superflu : pas de carrousels inutiles, pas de pop-ups, pas de fonctionnalités gadget.

Règle simple : **« pas cheap » = cohérent et propre** ; **« pas trop pro » = on a le droit d'être charmant et personnel.**

> Au moment du build du front, consulter la skill `frontend-design` pour les tokens de design et éviter
> l'esthétique IA générique.

---

## 4. Stack technique

Tout est **auto-hébergé**, un seul process Node, PostgreSQL sur la même machine.

| Couche | Choix | Pourquoi |
|---|---|---|
| Framework | **Next.js (App Router, `output: 'standalone'`) + TypeScript** | Site public + admin + routes serveur dans un seul projet, un seul process Node. |
| Base de données | **Ton PostgreSQL existant, base dédiée `bazar_laura`** | Tu le maîtrises, il tourne déjà, zéro nouveau vendor. Isolée du trading. |
| Accès DB | **`pg` (node-postgres) en SQL** ou **Drizzle** si tu veux le typage TS | Au choix — tu connais le SQL par cœur ; Drizzle apporte juste les types. |
| Auth admin | **Auth.js (NextAuth), credentials provider** | Une seule utilisatrice (Laura). Mot de passe hashé, session cookie. |
| Stockage images | **Filesystem local** (dossier `uploads/covers`, servi par le reverse proxy) | Simple, facile à sauvegarder. Les couvertures d'API restent en hotlink. |
| Scan code-barres | **`@zxing/browser`** (fallback API `BarcodeDetector`) | EAN-13 = ISBN-13, cross-platform iOS/Android. |
| Admin = **PWA** | manifest + service worker | Laura « installe » l'app sur son écran d'accueil. |
| Dev → Prod | **Laptop** (`next dev` + Postgres local) → **VPS** (build + systemd/pm2 + Caddy/nginx pour le TLS) | Postgres sur le même hôte, pool de connexions via `pg.Pool` (process long, pas de souci serverless). |

> Pas de Supabase : tu as déjà Postgres et l'ops qui va avec. Les deux seules briques que Supabase
> aurait apportées « gratuitement » — l'auth et le storage — sont remplacées ici par Auth.js et un
> dossier local. La RLS est native à Postgres si on en veut (voir §6).

---

## 5. Architecture

Un seul projet Next.js, un seul process long :

```
/                 → accueil (histoire + mise en avant)
/catalogue        → liste filtrable des livres dispos
/livre/[id]       → fiche d'un livre + boutons contact
/a-propos         → le projet, le stand, contacter Laura
/admin            → (protégé) tableau de bord stock
/admin/scan       → (protégé) scanner + ajout rapide
/admin/livre/[id] → (protégé) édition d'une fiche
/api/isbn/[isbn]  → route serveur : lookup métadonnées (voir §7)
/uploads/covers/* → images uploadées par Laura (servies par le reverse proxy en prod)
```

- Routes `/admin/*` protégées par middleware (session Auth.js).
- Le lookup ISBN passe **toujours côté serveur** (`/api/isbn/...`) pour éviter le CORS et centraliser la cascade de fallback.
- **Connexions DB** : un pool `pg` partagé (process long → on garde le pool ouvert, pas besoin de pgBouncer à cette échelle).
- **En prod (VPS)** : app lancée en service (systemd ou pm2), reverse proxy (Caddy recommandé pour le TLS auto, ou nginx) qui sert aussi `/uploads`. Postgres sur le même hôte, **base dédiée + rôle applicatif à privilèges minimaux**, sauvegardes régulières.

---

## 6. Modèle de données (PostgreSQL)

À appliquer dans la base dédiée `bazar_laura` (pas dans la base de trading).

```sql
-- Catégories adaptées à une librairie française
create type book_category as enum (
  'roman', 'polar_thriller', 'sf_fantasy', 'bd_manga', 'jeunesse',
  'documentaire', 'essai_bio', 'cuisine_loisirs', 'art_beaux_livres',
  'poesie_theatre', 'magazine', 'scolaire_langues', 'autre'
);

-- État du livre
create type book_condition as enum (
  'neuf', 'comme_neuf', 'tres_bon', 'bon', 'correct'
);

-- Statut dans le stock
create type book_status as enum (
  'disponible', 'reserve', 'vendu', 'masque'
);

create table books (
  id             uuid primary key default gen_random_uuid(),  -- natif PG 13+
  isbn           text,                          -- ISBN-13 normalisé (null possible : magazines sans ISBN)
  title          text not null,
  subtitle       text,
  authors        text[] default '{}',
  publisher      text,
  published_date text,                          -- format brut de l'API (année ou date)
  description    text,
  cover_url      text,                          -- URL d'API ou chemin /uploads/covers/...
  language       text default 'fr',
  page_count     int,
  category       book_category default 'autre',
  condition      book_condition default 'bon',
  price          numeric(8,2) not null,         -- en THB (฿)
  status         book_status default 'disponible',
  notes          text,                          -- notes INTERNES (jamais exposées publiquement)
  source         text,                          -- 'google_books' | 'open_library' | 'manuel'
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create index on books (status);
create index on books (category);

-- Admin (Laura) pour Auth.js credentials
create table admin_users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  password_hash text not null,                  -- bcrypt / argon2
  created_at    timestamptz default now()
);
```

### Contrôle d'accès
À cette échelle, le contrôle d'accès se fait **au niveau applicatif**, c'est suffisant et plus simple :
- **Public** : les requêtes publiques filtrent toujours `status in ('disponible','reserve')` et **ne sélectionnent jamais** la colonne `notes`.
- **Admin** : écritures uniquement depuis les routes `/admin/*` et `/api` protégées par session.
- Toujours des **requêtes paramétrées** (jamais de concaténation SQL).
- Rôle Postgres applicatif dédié, à privilèges minimaux sur la base `bazar_laura`.

> Optionnel (défense en profondeur) : on peut activer la **RLS native Postgres** plus tard, mais ce
> n'est pas requis pour une appli mono-utilisateur où l'app gère déjà les droits.

> Grille de prix : on garde le principe par format (≈ 80฿ à 230฿, paliers spécifiques pour les
> magazines). Prix **libre** dans le formulaire, mais avec des **boutons de prix rapides**
> (80 / 120 / 150 / 180 / 230) pour aller vite au scan.

---

## 7. Récupération des infos depuis l'ISBN

Route serveur `GET /api/isbn/{isbn}`. Cascade, on s'arrête au premier succès :

### 7.1 — Google Books (priorité)
```
GET https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}
```
Mapper `items[0].volumeInfo` :
- `title`, `subtitle`
- `authors[]` → `authors`
- `publisher` → `publisher`
- `publishedDate` → `published_date`
- `description` → `description`
- `pageCount` → `page_count`
- `language` → `language`
- `imageLinks.thumbnail` → `cover_url` (⚠️ forcer `https`, retirer `&edge=curl`, augmenter le zoom pour une meilleure image)
- `categories[]` → suggestion de `category` (mapping libre, défaut `autre`)

Clé API optionnelle (`GOOGLE_BOOKS_API_KEY`) — pas indispensable à faible volume, mais recommandée contre le rate-limit.

### 7.2 — Open Library (fallback)
```
GET https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data
```
Mapper l'objet `ISBN:{isbn}` :
- `title`, `subtitle`
- `authors[].name` → `authors`
- `publishers[].name` → `publisher`
- `publish_date` → `published_date`
- `number_of_pages` → `page_count`
- `cover.large` / `cover.medium` → `cover_url`

Couverture de secours directe (vérifier que l'image n'est pas un placeholder 1×1) :
```
https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg
```

### 7.3 — Saisie manuelle (dernier recours)
Si rien n'est trouvé (fréquent pour des titres FR de poche ou les magazines), le formulaire
s'ouvre **vide mais éditable**, Laura remplit à la main. `source` = `'manuel'`.

### Contrat de la route
Réponse **normalisée** quelle que soit la source, + `source` :

```ts
type IsbnLookupResult = {
  found: boolean;
  source: 'google_books' | 'open_library' | null;
  data: {
    isbn: string;
    title: string | null;
    subtitle: string | null;
    authors: string[];
    publisher: string | null;
    published_date: string | null;
    description: string | null;
    cover_url: string | null;
    language: string | null;
    page_count: number | null;
  } | null;
};
```

> ⚠️ Vérifier la forme exacte des réponses des deux API au moment de l'implémentation et gérer
> proprement les champs manquants.
> Amélioration future possible : la **BnF** (API SRU) couvre très bien les livres français mais
> renvoie de l'UNIMARC/XML — à n'envisager que si Google Books + Open Library laissent trop de trous.

---

## 8. Appli admin (PWA) — parcours de Laura

1. **Connexion** (`/admin`) via Auth.js (credentials).
2. **Scanner** (`/admin/scan`) :
   - Ouvre la caméra (`@zxing/browser`, `BrowserMultiFormatReader`, format EAN-13).
   - Bouton « saisir l'ISBN à la main » en secours.
   - Au scan → appel `/api/isbn/{isbn}` → pré-remplissage du formulaire.
3. **Formulaire de validation** (rapide, pensé mobile, gros boutons tactiles) :
   - Champs auto-remplis (modifiables) : titre, auteurs, éditeur, couverture, etc.
   - Champs à renseigner : **prix** (boutons rapides + champ libre), **catégorie**, **état**, **statut** (défaut `disponible`), notes internes.
   - **Prendre une photo** de la vraie couverture → upload dans `uploads/covers`, écrase `cover_url`.
   - **Valider** → insertion dans `books`.
4. **Tableau de bord** (`/admin`) : liste du stock, recherche, filtres, changement de statut en un tap
   (`vendu` / `reserve` / `masque`), édition complète (`/admin/livre/[id]`).

UX clés :
- Confortable **à une main sur téléphone** (Laura cataloguera debout, au stand).
- Feedback clair après scan (vibration / son + aperçu de la couverture trouvée).
- Cas « ISBN déjà en stock » → proposer d'éditer l'existant plutôt que dupliquer.

---

## 9. Site public — détails

### Accueil `/`
Hero : nom, une phrase qui raconte le projet, une photo du stand, CTA « Voir le catalogue », mot personnel de Laura.

### Catalogue `/catalogue`
- Grille de cartes (couverture, titre, auteur, prix ฿, badge état).
- Filtres : catégorie, fourchette de prix, recherche texte (titre/auteur).
- N'affiche que `disponible` / `reserve` (les `reserve` avec un badge « réservé »).

### Fiche livre `/livre/[id]`
- Grande couverture, métadonnées, prix, état, description.
- **Boutons de contact** (voir §10), livre déjà référencé dans le message.

### À propos `/a-propos`
Le projet, le stand, les prochains événements, comment contacter Laura.

---

## 10. Intégration contact (WhatsApp / Line)

Pas de paiement : chaque fiche propose de contacter Laura, livre **pré-mentionné**.

### WhatsApp (pré-remplissage fiable)
```
https://wa.me/{NUMERO}?text={message_encodé}
```
Message type :
```
Bonjour Laura ! Je suis intéressé(e) par « {title} » ({price}฿) vu sur Le bazar de Laura.
```
(encoder via `encodeURIComponent`).

### Line (limitation à connaître)
`https://line.me/R/ti/p/{LINE_ID}` ouvre la conversation mais **ne pré-remplit pas** le message de
façon fiable pour un compte personnel. Solution : ouvrir Line **et** afficher une référence courte à
copier-coller (titre + prix) + bouton « Copier le message ». Si Laura passe sur un **compte Line
Officiel**, on pourra utiliser `https://line.me/R/oaMessage/{ID}/?{texte}`.

> Numéro WhatsApp et ID Line dans les variables d'environnement (§11), jamais en dur.

---

## 11. Variables d'environnement

```
# PostgreSQL (base dédiée, rôle applicatif à privilèges minimaux)
DATABASE_URL=postgres://bazar_app:motdepasse@localhost:5432/bazar_laura

# Auth.js
AUTH_SECRET=                         # générer une valeur aléatoire forte
AUTH_URL=http://localhost:3000       # URL du VPS en prod

# Stockage des couvertures uploadées
UPLOAD_DIR=./uploads/covers          # chemin disque
NEXT_PUBLIC_UPLOAD_BASE_URL=/uploads/covers   # URL publique servie par le reverse proxy

# Lookup ISBN (optionnel)
GOOGLE_BOOKS_API_KEY=

# Contact
NEXT_PUBLIC_WHATSAPP_NUMBER=         # format international sans '+' ni espaces, ex: 66XXXXXXXXX
NEXT_PUBLIC_LINE_ID=
```

---

## 12. Conventions

- **Langue de l'interface : français** (bilingue FR/EN possible plus tard).
- **Devise : THB (฿)**, affichée après le montant à la thaïlandaise (ex : `150฿`).
- Identifiants de code / colonnes / variables **en anglais** ; textes affichés **en français**.
- `notes` est **interne**, jamais exposé côté public.
- Couvertures : préférer la photo réelle prise par Laura ; sinon l'image de l'API.

---

## 13. Feuille de route (build incrémental)

1. **Setup** — projet Next.js + TS (`output: standalone`), base dédiée `bazar_laura` sur ton Postgres, rôle applicatif, schéma SQL + migrations, pool `pg`, variables d'env, dossier `uploads/covers`.
2. **Lookup ISBN** — route `/api/isbn/{isbn}` (Google Books → Open Library → null), normalisation + tests sur quelques ISBN FR réels.
3. **Admin** — Auth.js (credentials) + middleware, page scan (`@zxing/browser`), formulaire de validation, upload couverture, insertion, tableau de bord.
4. **Public** — catalogue + filtres, fiche livre, boutons contact, page à-propos.
5. **Design** — passe « amateur soigné » (palette, typographies, mise en page, touches perso).
6. **PWA + déploiement VPS** — manifest, service worker, install mobile ; sur le VPS : build, service systemd/pm2, reverse proxy Caddy/nginx (TLS + sert `/uploads`), Postgres local, sauvegardes.

À chaque phase : commit propre, et vérifier le rendu **sur mobile** (cible principale de l'admin).
