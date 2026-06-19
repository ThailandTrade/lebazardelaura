import { query } from "@/lib/db";
import {
  CATEGORY_VALUES,
  CONDITION_VALUES,
  STATUS_VALUES,
  type BookCategory,
  type BookCondition,
  type BookStatus,
} from "@/lib/constants";

export type Book = {
  id: string;
  isbn: string | null;
  title: string;
  subtitle: string | null;
  authors: string[];
  publisher: string | null;
  published_date: string | null;
  description: string | null;
  cover_url: string | null;
  language: string | null;
  page_count: number | null;
  category: BookCategory;
  condition: BookCondition;
  price: string; // numeric → string côté pg
  status: BookStatus;
  quantity: number;
  notes: string | null;
  source: string | null;
  format: string | null; // poche / grand_format (surtout pour les romans)
  entry_date: string | null; // date d'entrée en stock
  exit_date: string | null;  // date de sortie (vente) ; null tant qu'en stock
  created_at: string;
  updated_at: string;
};

// Vue publique : jamais les notes internes ni les dates d'entrée/sortie, jamais les
// livres vendus/masqués.
export type PublicBook = Omit<Book, "notes" | "status" | "entry_date" | "exit_date"> & {
  status: "disponible" | "reserve";
};

// Un « exemplaire » disponible d'un titre = une ligne books (un état, un prix, une quantité).
export type BookVariant = {
  id: string;
  condition: BookCondition;
  price: string;
  quantity: number;
  status: "disponible" | "reserve";
};

// Un titre regroupé pour l'affichage public : métadonnées (du plus récent) + ses
// exemplaires disponibles (mêmes ISBN), triés par prix croissant.
export type PublicBookGroup = PublicBook & {
  variants: BookVariant[];
  minPrice: number;
};

// Ligne de stock minimale pour le flux de scan admin (détection de doublon).
export type StockLine = {
  id: string;
  title: string;
  condition: BookCondition;
  price: string;
  quantity: number;
  status: BookStatus;
  entry_date: string | null;
  exit_date: string | null;
};

// Un état d'un titre, côté admin (tableau de bord + fiche regroupée).
export type AdminVariant = {
  id: string;
  condition: BookCondition;
  price: string;
  quantity: number;
  status: BookStatus;
  entry_date: string | null;
  exit_date: string | null;
};

// Un titre regroupé pour le tableau de bord admin : une entrée par livre (par ISBN ;
// les livres sans ISBN restent distincts), avec la liste de ses états.
export type AdminBookGroup = {
  id: string; // ligne représentante (lien vers la fiche d'édition)
  title: string;
  subtitle: string | null;
  authors: string[];
  category: BookCategory;
  cover_url: string | null;
  isbn: string | null;
  variants: AdminVariant[];
  totalQuantity: number;
};

export type BookInput = {
  isbn: string | null;
  title: string;
  subtitle: string | null;
  authors: string[];
  publisher: string | null;
  published_date: string | null;
  description: string | null;
  cover_url: string | null;
  language: string | null;
  page_count: number | null;
  category: BookCategory;
  condition: BookCondition;
  price: number;
  status: BookStatus;
  quantity: number;
  notes: string | null;
  source: string | null;
  format: string | null;
  exit_date?: string | null; // optionnel : forcé à now() à la vente, sinon déduit du statut
};

const PUBLIC_COLUMNS = `id, isbn, title, subtitle, authors, publisher, published_date,
  description, cover_url, language, page_count, category, condition, price, status,
  quantity, source, format, created_at, updated_at`;

export type CatalogueFilter = {
  category?: string;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
};

/** Catalogue public : uniquement disponible / réservé, sans les notes. */
export async function listPublicBooks(filter: CatalogueFilter = {}): Promise<PublicBook[]> {
  const where: string[] = ["status in ('disponible','reserve')", "quantity > 0"];
  const params: unknown[] = [];

  const byCategory = !!(filter.category && CATEGORY_VALUES.includes(filter.category as BookCategory));
  if (byCategory) {
    params.push(filter.category);
    where.push(`category = $${params.length}`);
  }
  if (filter.q && filter.q.trim()) {
    params.push(`%${filter.q.trim()}%`);
    const i = params.length;
    where.push(`(title ilike $${i} or array_to_string(authors, ' ') ilike $${i})`);
  }
  if (typeof filter.minPrice === "number" && Number.isFinite(filter.minPrice)) {
    params.push(filter.minPrice);
    where.push(`price >= $${params.length}`);
  }
  if (typeof filter.maxPrice === "number" && Number.isFinite(filter.maxPrice)) {
    params.push(filter.maxPrice);
    where.push(`price <= $${params.length}`);
  }

  // Catégorie sélectionnée → tri alphabétique. Pour Enfants/Jeunesse : par titre.
  // Pour les autres catégories : par auteur (1er auteur) puis par titre, livres sans
  // auteur en dernier. Sans catégorie : ordre « derniers arrivés ».
  const titleSorted = byCategory && (filter.category === "enfants" || filter.category === "jeunesse");
  const orderBy = !byCategory
    ? "created_at desc"
    : titleSorted
      ? "lower(title) asc, created_at desc"
      : "lower(authors[1]) asc nulls last, lower(title) asc, created_at desc";

  return query<PublicBook>(
    `select ${PUBLIC_COLUMNS} from books
       where ${where.join(" and ")}
       order by ${orderBy}`,
    params,
  );
}

export async function getPublicBook(id: string): Promise<PublicBook | null> {
  const rows = await query<PublicBook>(
    `select ${PUBLIC_COLUMNS} from books
       where id = $1 and status in ('disponible','reserve') and quantity > 0`,
    [id],
  );
  return rows[0] ?? null;
}

function toVariant(b: PublicBook): BookVariant {
  return { id: b.id, condition: b.condition, price: b.price, quantity: b.quantity, status: b.status };
}

// Tri des exemplaires : meilleur état d'abord (l'ordre de CONDITION_VALUES va du
// meilleur au moins bon), prix croissant en départage.
function byBestCondition(
  a: { condition: BookCondition; price: string },
  b: { condition: BookCondition; price: string },
): number {
  const r = CONDITION_VALUES.indexOf(a.condition) - CONDITION_VALUES.indexOf(b.condition);
  return r !== 0 ? r : Number(a.price) - Number(b.price);
}

/**
 * Catalogue public regroupé : les lignes partageant un même ISBN sont fusionnées en
 * un seul « titre » (avec ses exemplaires/états). Les livres sans ISBN restent distincts.
 */
export async function listPublicBookGroups(filter: CatalogueFilter = {}): Promise<PublicBookGroup[]> {
  const rows = await listPublicBooks(filter); // déjà filtré + trié par created_at desc
  const groups = new Map<string, PublicBookGroup>();
  const order: string[] = [];

  for (const r of rows) {
    const key = r.isbn ? `isbn:${r.isbn}` : `id:${r.id}`;
    let g = groups.get(key);
    if (!g) {
      // Représentant = première ligne rencontrée = la plus récente (métadonnées affichées).
      g = { ...r, variants: [], minPrice: Number(r.price) };
      groups.set(key, g);
      order.push(key);
    }
    g.variants.push(toVariant(r));
    g.minPrice = Math.min(g.minPrice, Number(r.price));
    if (r.status === "disponible") g.status = "disponible"; // dispo si au moins un exemplaire l'est
  }

  for (const g of groups.values()) {
    g.variants.sort(byBestCondition);
  }
  return order.map((k) => groups.get(k)!);
}

/** Fiche publique regroupée : le titre + tous ses exemplaires disponibles (même ISBN). */
export async function getPublicBookGroup(id: string): Promise<PublicBookGroup | null> {
  const rep = await getPublicBook(id);
  if (!rep) return null;

  let variantRows: PublicBook[];
  if (rep.isbn) {
    variantRows = await query<PublicBook>(
      `select ${PUBLIC_COLUMNS} from books
         where isbn = $1 and status in ('disponible','reserve') and quantity > 0`,
      [rep.isbn],
    );
  } else {
    variantRows = [rep];
  }

  const variants = variantRows.map(toVariant).sort(byBestCondition);
  const minPrice = Math.min(...variants.map((v) => Number(v.price)));
  return { ...rep, variants, minPrice };
}

// --- Admin (toutes colonnes, tous statuts) ---

export async function listAdminBooks(
  opts: { q?: string; status?: string; category?: string } = {},
): Promise<Book[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.q && opts.q.trim()) {
    params.push(`%${opts.q.trim()}%`);
    const i = params.length;
    where.push(`(title ilike $${i} or array_to_string(authors, ' ') ilike $${i} or isbn ilike $${i})`);
  }
  if (opts.status && STATUS_VALUES.includes(opts.status as BookStatus)) {
    params.push(opts.status);
    where.push(`status = $${params.length}`);
  }
  if (opts.category && CATEGORY_VALUES.includes(opts.category as BookCategory)) {
    params.push(opts.category);
    where.push(`category = $${params.length}`);
  }
  return query<Book>(
    `select * from books ${where.length ? `where ${where.join(" and ")}` : ""}
       order by lower(title) asc, created_at desc`,
    params,
  );
}

/**
 * Tableau de bord regroupé : une entrée par titre (par ISBN ; sans ISBN = distinct),
 * avec ses états triés du meilleur au moins bon. La ligne représentante (la plus
 * récente) porte les métadonnées et l'id de la fiche d'édition.
 */
export async function listAdminBookGroups(
  opts: { q?: string; status?: string; category?: string } = {},
): Promise<AdminBookGroup[]> {
  const rows = await listAdminBooks(opts); // triées created_at desc
  const groups = new Map<string, AdminBookGroup>();
  const order: string[] = [];

  for (const r of rows) {
    const key = r.isbn ? `isbn:${r.isbn}` : `id:${r.id}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        id: r.id,
        title: r.title,
        subtitle: r.subtitle,
        authors: r.authors,
        category: r.category,
        cover_url: r.cover_url,
        isbn: r.isbn,
        variants: [],
        totalQuantity: 0,
      };
      groups.set(key, g);
      order.push(key);
    }
    g.variants.push({
      id: r.id,
      condition: r.condition,
      price: r.price,
      quantity: r.quantity,
      status: r.status,
      entry_date: r.entry_date,
      exit_date: r.exit_date,
    });
    g.totalQuantity += r.quantity;
  }

  for (const g of groups.values()) g.variants.sort(byBestCondition);
  return order.map((k) => groups.get(k)!);
}

/** Comptes par statut (pour les filtres du tableau de bord). */
export async function countByStatus(): Promise<Record<string, number>> {
  const rows = await query<{ status: string; n: string }>(
    "select status::text as status, count(*)::text as n from books group by status",
  );
  return Object.fromEntries(rows.map((r) => [r.status, Number(r.n)]));
}

export async function getBook(id: string): Promise<Book | null> {
  const rows = await query<Book>("select * from books where id = $1", [id]);
  return rows[0] ?? null;
}

export async function findByIsbn(isbn: string): Promise<Book | null> {
  const rows = await query<Book>("select * from books where isbn = $1 limit 1", [isbn]);
  return rows[0] ?? null;
}

/** Toutes les lignes de stock d'un ISBN (pour proposer +1 ou un autre état au scan). */
export async function findAllByIsbn(isbn: string): Promise<StockLine[]> {
  return query<StockLine>(
    `select id, title, condition, price, quantity, status, entry_date, exit_date from books
       where isbn = $1 order by created_at desc`,
    [isbn],
  );
}

export async function createBook(input: BookInput): Promise<string> {
  const rows = await query<{ id: string }>(
    `insert into books
       (isbn, title, subtitle, authors, publisher, published_date, description,
        cover_url, language, page_count, category, condition, price, status, notes, source, quantity,
        exit_date, format)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::book_status,$15,$16,$17,
        coalesce($18::timestamptz, case when $14 = 'vendu' then now() else null end), $19)
     returning id`,
    [
      input.isbn, input.title, input.subtitle, input.authors, input.publisher,
      input.published_date, input.description, input.cover_url, input.language,
      input.page_count, input.category, input.condition, input.price, input.status,
      input.notes, input.source, input.quantity,
      input.exit_date ?? null, input.format ?? null,
    ],
  );
  return rows[0].id;
}

export async function updateBook(id: string, input: BookInput): Promise<void> {
  await query(
    `update books set
       isbn=$2, title=$3, subtitle=$4, authors=$5, publisher=$6, published_date=$7,
       description=$8, cover_url=$9, language=$10, page_count=$11, category=$12,
       condition=$13, price=$14, status=$15::book_status, notes=$16, source=$17, quantity=$18,
       format=$19,
       exit_date = case when $15 = 'vendu' then coalesce(exit_date, now()) else null end
     where id=$1`,
    [
      id, input.isbn, input.title, input.subtitle, input.authors, input.publisher,
      input.published_date, input.description, input.cover_url, input.language,
      input.page_count, input.category, input.condition, input.price, input.status,
      input.notes, input.source, input.quantity, input.format ?? null,
    ],
  );
}

export async function setStatus(id: string, status: BookStatus): Promise<void> {
  if (!STATUS_VALUES.includes(status)) throw new Error("Statut invalide");
  // Passer à « vendu » horodate la sortie ; revenir en stock l'efface.
  await query(
    `update books set status = $2::book_status,
       exit_date = case when $2 = 'vendu' then coalesce(exit_date, now()) else null end
     where id = $1`,
    [id, status],
  );
}

/** Ajuste la quantité (jamais en dessous de 0). */
export async function adjustQuantity(id: string, delta: number): Promise<void> {
  await query("update books set quantity = greatest(0, quantity + $2) where id = $1", [id, delta]);
}

export async function deleteBook(id: string): Promise<void> {
  await query("delete from books where id = $1", [id]);
}

/** Supprime tous les états d'un même ISBN (suppression d'un titre entier). */
export async function deleteByIsbn(isbn: string): Promise<void> {
  await query("delete from books where isbn = $1", [isbn]);
}

/** Garde-fous de validation partagés (formulaire admin). */
export function isValidCategory(v: string): v is BookCategory {
  return CATEGORY_VALUES.includes(v as BookCategory);
}
export function isValidCondition(v: string): v is BookCondition {
  return CONDITION_VALUES.includes(v as BookCondition);
}
export function isValidStatus(v: string): v is BookStatus {
  return STATUS_VALUES.includes(v as BookStatus);
}
