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
  notes: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
};

// Vue publique : jamais les notes internes, jamais les livres vendus/masqués.
export type PublicBook = Omit<Book, "notes" | "status"> & { status: "disponible" | "reserve" };

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
  notes: string | null;
  source: string | null;
};

const PUBLIC_COLUMNS = `id, isbn, title, subtitle, authors, publisher, published_date,
  description, cover_url, language, page_count, category, condition, price, status,
  source, created_at, updated_at`;

export type CatalogueFilter = {
  category?: string;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
};

/** Catalogue public : uniquement disponible / réservé, sans les notes. */
export async function listPublicBooks(filter: CatalogueFilter = {}): Promise<PublicBook[]> {
  const where: string[] = ["status in ('disponible','reserve')"];
  const params: unknown[] = [];

  if (filter.category && CATEGORY_VALUES.includes(filter.category as BookCategory)) {
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

  return query<PublicBook>(
    `select ${PUBLIC_COLUMNS} from books
       where ${where.join(" and ")}
       order by created_at desc`,
    params,
  );
}

export async function getPublicBook(id: string): Promise<PublicBook | null> {
  const rows = await query<PublicBook>(
    `select ${PUBLIC_COLUMNS} from books
       where id = $1 and status in ('disponible','reserve')`,
    [id],
  );
  return rows[0] ?? null;
}

// --- Admin (toutes colonnes, tous statuts) ---

export async function listAdminBooks(q?: string): Promise<Book[]> {
  if (q && q.trim()) {
    return query<Book>(
      `select * from books
         where title ilike $1 or array_to_string(authors, ' ') ilike $1 or isbn ilike $1
         order by created_at desc`,
      [`%${q.trim()}%`],
    );
  }
  return query<Book>("select * from books order by created_at desc");
}

export async function getBook(id: string): Promise<Book | null> {
  const rows = await query<Book>("select * from books where id = $1", [id]);
  return rows[0] ?? null;
}

export async function findByIsbn(isbn: string): Promise<Book | null> {
  const rows = await query<Book>("select * from books where isbn = $1 limit 1", [isbn]);
  return rows[0] ?? null;
}

export async function createBook(input: BookInput): Promise<string> {
  const rows = await query<{ id: string }>(
    `insert into books
       (isbn, title, subtitle, authors, publisher, published_date, description,
        cover_url, language, page_count, category, condition, price, status, notes, source)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     returning id`,
    [
      input.isbn, input.title, input.subtitle, input.authors, input.publisher,
      input.published_date, input.description, input.cover_url, input.language,
      input.page_count, input.category, input.condition, input.price, input.status,
      input.notes, input.source,
    ],
  );
  return rows[0].id;
}

export async function updateBook(id: string, input: BookInput): Promise<void> {
  await query(
    `update books set
       isbn=$2, title=$3, subtitle=$4, authors=$5, publisher=$6, published_date=$7,
       description=$8, cover_url=$9, language=$10, page_count=$11, category=$12,
       condition=$13, price=$14, status=$15, notes=$16, source=$17
     where id=$1`,
    [
      id, input.isbn, input.title, input.subtitle, input.authors, input.publisher,
      input.published_date, input.description, input.cover_url, input.language,
      input.page_count, input.category, input.condition, input.price, input.status,
      input.notes, input.source,
    ],
  );
}

export async function setStatus(id: string, status: BookStatus): Promise<void> {
  if (!STATUS_VALUES.includes(status)) throw new Error("Statut invalide");
  await query("update books set status = $2 where id = $1", [id, status]);
}

export async function deleteBook(id: string): Promise<void> {
  await query("delete from books where id = $1", [id]);
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
