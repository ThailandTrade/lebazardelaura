// Lookup des métadonnées d'un livre à partir de l'ISBN.
// Cascade : Google Books → Open Library → null. On s'arrête au premier succès.
// Toujours côté serveur (évite le CORS, centralise les fallbacks).

export type IsbnLookupData = {
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
};

export type IsbnLookupResult = {
  found: boolean;
  source: "google_books" | "open_library" | null;
  data: IsbnLookupData | null;
};

const FETCH_TIMEOUT_MS = 6_000;

/**
 * Normalise un ISBN : retire tirets/espaces, met le X final en majuscule.
 * Renvoie null si la longueur n'est pas 10 ou 13 (forme invalide).
 */
export function normalizeIsbn(raw: string): string | null {
  const cleaned = raw.replace(/[\s-]/g, "").toUpperCase();
  if (!/^(\d{9}[\dX]|\d{13})$/.test(cleaned)) return null;
  return cleaned;
}

async function fetchJson(url: string): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    // réseau / timeout / JSON invalide → on laisse la cascade continuer
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Couverture Google Books : forcer https, retirer edge=curl, viser une meilleure résolution. */
function cleanGoogleCover(url: string | undefined): string | null {
  if (!url) return null;
  let out = url.replace(/^http:\/\//, "https://");
  out = out.replace(/&edge=curl/gi, "");
  out = out.replace(/([?&])zoom=\d+/i, "$1zoom=2");
  return out;
}

type GoogleVolume = {
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    pageCount?: number;
    language?: string;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  };
};

async function lookupGoogleBooks(isbn: string): Promise<IsbnLookupData | null> {
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  const url =
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}` +
    (key ? `&key=${encodeURIComponent(key)}` : "");
  const json = (await fetchJson(url)) as { items?: GoogleVolume[] } | null;
  const info = json?.items?.[0]?.volumeInfo;
  if (!info || !info.title) return null;

  return {
    isbn,
    title: info.title ?? null,
    subtitle: info.subtitle ?? null,
    authors: Array.isArray(info.authors) ? info.authors : [],
    publisher: info.publisher ?? null,
    published_date: info.publishedDate ?? null,
    description: info.description ?? null,
    cover_url: cleanGoogleCover(info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail),
    language: info.language ?? null,
    page_count: typeof info.pageCount === "number" ? info.pageCount : null,
  };
}

type OpenLibraryBook = {
  title?: string;
  subtitle?: string;
  authors?: { name?: string }[];
  publishers?: { name?: string }[];
  publish_date?: string;
  number_of_pages?: number;
  cover?: { small?: string; medium?: string; large?: string };
};

/**
 * Couverture de secours directe via l'endpoint covers d'Open Library.
 * `default=false` → 404 s'il n'y a pas de vraie couverture (au lieu d'un placeholder 1×1).
 */
async function openLibraryIsbnCover(isbn: string): Promise<string | null> {
  const base = `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(isbn)}-L.jpg`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${base}?default=false`, {
      method: "HEAD",
      signal: controller.signal,
    });
    return res.ok ? base : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function lookupOpenLibrary(isbn: string): Promise<IsbnLookupData | null> {
  const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(
    isbn,
  )}&format=json&jscmd=data`;
  const json = (await fetchJson(url)) as Record<string, OpenLibraryBook> | null;
  const book = json?.[`ISBN:${isbn}`];
  if (!book || !book.title) return null;

  // jscmd=data ne renvoie une couverture que si elle existe réellement.
  // Sinon, on tente l'endpoint covers par ISBN (filtré du placeholder 1×1).
  const coverFromData = book.cover?.large ?? book.cover?.medium ?? book.cover?.small ?? null;
  const cover = coverFromData ?? (await openLibraryIsbnCover(isbn));

  return {
    isbn,
    title: book.title ?? null,
    subtitle: book.subtitle ?? null,
    authors: Array.isArray(book.authors)
      ? book.authors.map((a) => a.name).filter((n): n is string => Boolean(n))
      : [],
    publisher: book.publishers?.[0]?.name ?? null,
    published_date: book.publish_date ?? null,
    description: null, // jscmd=data n'expose pas de description fiable
    cover_url: cover ? cover.replace(/^http:\/\//, "https://") : null,
    language: null,
    page_count: typeof book.number_of_pages === "number" ? book.number_of_pages : null,
  };
}

/** Cascade complète. Renvoie toujours un résultat normalisé. */
export async function lookupIsbn(isbn: string): Promise<IsbnLookupResult> {
  const google = await lookupGoogleBooks(isbn);
  if (google) return { found: true, source: "google_books", data: google };

  const openlib = await lookupOpenLibrary(isbn);
  if (openlib) return { found: true, source: "open_library", data: openlib };

  return { found: false, source: null, data: null };
}
