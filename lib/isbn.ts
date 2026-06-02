// Lookup des métadonnées d'un livre à partir de l'ISBN.
// Cascade : Google Books → BnF (SRU/UNIMARC) → Open Library → null.
// On s'arrête au premier succès. Toujours côté serveur (CORS + fallbacks centralisés).

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

export type IsbnSource = "google_books" | "bnf" | "open_library";

export type IsbnLookupResult = {
  found: boolean;
  source: IsbnSource | null;
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

/** Convertit un ISBN-13 préfixé 978 en ISBN-10 (avec clé de contrôle). */
export function isbn13to10(isbn13: string): string | null {
  if (!/^978\d{10}$/.test(isbn13)) return null;
  const core = isbn13.slice(3, 12);
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (10 - i) * Number(core[i]);
  const check = (11 - (sum % 11)) % 11;
  return core + (check === 10 ? "X" : String(check));
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

// --- BnF (SRU / UNIMARC) : filet pour le fonds FR (dépôt légal) ---

const BNF_SRU =
  "https://catalogue.bnf.fr/api/SRU?version=1.2&operation=searchRetrieve&maximumRecords=1&query=";

async function fetchText(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function decodeXml(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

/** Blocs internes de tous les datafields d'un tag UNIMARC (marcxchange BnF). */
function bnfDatafields(xml: string, tag: string): string[] {
  const re = new RegExp(`<mxc:datafield[^>]*tag="${tag}"[^>]*>([\\s\\S]*?)</mxc:datafield>`, "g");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(m[1]);
  return out;
}
function bnfSub(block: string, code: string): string | null {
  const m = block.match(new RegExp(`<mxc:subfield code="${code}">([\\s\\S]*?)</mxc:subfield>`));
  return m ? decodeXml(m[1]) : null;
}
function bnfFirst(xml: string, tag: string, code: string): string | null {
  const f = bnfDatafields(xml, tag)[0];
  return f ? bnfSub(f, code) : null;
}

async function bnfCover(ark: string): Promise<string | null> {
  const url = `https://catalogue.bnf.fr/couverture?appName=NE&idArk=${ark}&couverture=1`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    const ct = res.headers.get("content-type") ?? "";
    // Pas de couverture → la BnF répond en HTML (et non image/*).
    return res.ok && ct.startsWith("image/") ? url : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function lookupBnf(isbn: string): Promise<IsbnLookupData | null> {
  // La BnF indexe l'ISBN tel qu'imprimé : on tente le 13 puis le 10.
  // Un retry sur échec réseau (la BnF throttle / time out par à-coups).
  const variants = [isbn, isbn13to10(isbn)].filter((v): v is string => Boolean(v));
  let xml: string | null = null;
  for (const v of variants) {
    for (let attempt = 0; attempt < 2 && !xml; attempt++) {
      const x = await fetchText(BNF_SRU + encodeURIComponent(`bib.isbn all "${v}"`));
      if (x && /<mxc:record/.test(x)) {
        xml = x;
      } else if (x) {
        break; // réponse reçue mais aucune notice pour cette variante → pas de retry
      } else {
        await new Promise((r) => setTimeout(r, 700)); // échec transitoire → on réessaie
      }
    }
    if (xml) break;
  }
  if (!xml) return null;

  const title = bnfFirst(xml, "200", "a");
  if (!title) return null;

  const authors: string[] = [];
  for (const tag of ["700", "701", "702"]) {
    for (const f of bnfDatafields(xml, tag)) {
      const surname = bnfSub(f, "a");
      const forename = bnfSub(f, "b");
      const name = [forename, surname].filter(Boolean).join(" ").trim(); // « Prénom Nom »
      if (name) authors.push(name);
    }
  }
  if (authors.length === 0) {
    const resp = bnfFirst(xml, "200", "f"); // mention de responsabilité
    if (resp) authors.push(...resp.split(";").map((a) => a.trim()).filter(Boolean));
  }

  const pagesRaw = bnfFirst(xml, "215", "a");
  // « 1 vol. (191 p.) » → on veut le nombre suivi de « p », sinon le premier nombre.
  const pagesMatch = pagesRaw?.match(/(\d+)\s*p/i) ?? pagesRaw?.match(/(\d+)/);
  const lang = bnfFirst(xml, "101", "a")?.toLowerCase();
  const language = lang ? (lang.startsWith("fre") ? "fr" : lang.startsWith("eng") ? "en" : lang.slice(0, 2)) : null;
  const dateRaw = bnfFirst(xml, "210", "d");

  const arkMatch = xml.match(/id="(ark:[^"]+)"/);
  const cover_url = arkMatch ? await bnfCover(arkMatch[1]) : null;

  return {
    isbn,
    title,
    subtitle: bnfFirst(xml, "200", "e"),
    authors,
    publisher: bnfFirst(xml, "210", "c"),
    published_date: dateRaw ? dateRaw.replace(/^(DL|cop\.)\s*/i, "").replace(/[[\].]/g, "").trim() : null,
    description: bnfFirst(xml, "330", "a"),
    cover_url,
    language,
    page_count: pagesMatch ? parseInt(pagesMatch[1], 10) : null,
  };
}

/** Cascade complète. Renvoie toujours un résultat normalisé. */
export async function lookupIsbn(isbn: string): Promise<IsbnLookupResult> {
  const google = await lookupGoogleBooks(isbn);
  if (google) return { found: true, source: "google_books", data: google };

  const bnf = await lookupBnf(isbn);
  if (bnf) return { found: true, source: "bnf", data: bnf };

  const openlib = await lookupOpenLibrary(isbn);
  if (openlib) return { found: true, source: "open_library", data: openlib };

  return { found: false, source: null, data: null };
}
