import { isbn13to10 } from "@/lib/isbn";

// Rassemble plusieurs couvertures candidates pour un livre (l'utilisatrice choisit).
// Sources sans clé : Open Library (par ISBN + plusieurs éditions), BnF (ARK),
// Google Books (Dynamic Links, et API volumes si une clé est présente).

export type CoverCandidate = { url: string; source: string };

const TIMEOUT = 6_000;

async function timed(url: string, init?: RequestInit): Promise<Response | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function isImage(url: string): Promise<boolean> {
  const res = await timed(url, { method: "GET", headers: { Range: "bytes=0-0" } });
  if (!res || !res.ok) return false;
  return (res.headers.get("content-type") ?? "").startsWith("image/");
}

async function getJson<T>(url: string): Promise<T | null> {
  const res = await timed(url, { headers: { Accept: "application/json" } });
  if (!res || !res.ok) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function getText(url: string): Promise<string | null> {
  const res = await timed(url);
  return res && res.ok ? res.text() : null;
}

function cleanGoogle(url: string | undefined | null): string | null {
  if (!url) return null;
  return url
    .replace(/\\u0026/g, "&")
    .replace(/^http:\/\//, "https://")
    .replace(/&edge=curl/gi, "")
    .replace(/([?&])zoom=\d+/i, "$1zoom=1");
}

export async function findCoverCandidates(
  isbn: string,
  title?: string,
  author?: string,
): Promise<CoverCandidate[]> {
  const out: CoverCandidate[] = [];
  const seen = new Set<string>();
  const add = (url: string | null, source: string) => {
    if (url && !seen.has(url)) {
      seen.add(url);
      out.push({ url, source });
    }
  };

  const variants = [isbn, isbn13to10(isbn)].filter((v): v is string => Boolean(v));

  await Promise.all([
    // Open Library — couverture directe par ISBN (13 puis 10)
    ...variants.map(async (v) => {
      const base = `https://covers.openlibrary.org/b/isbn/${v}-L.jpg`;
      if (await isImage(`${base}?default=false`)) add(base, "Open Library");
    }),

    // Open Library — recherche (plusieurs éditions => plusieurs couvertures)
    (async () => {
      const q = title
        ? `title=${encodeURIComponent(title)}${author ? `&author=${encodeURIComponent(author)}` : ""}`
        : `q=${encodeURIComponent(isbn)}`;
      const j = await getJson<{ docs?: { cover_i?: number }[] }>(
        `https://openlibrary.org/search.json?${q}&fields=cover_i&limit=6`,
      );
      for (const doc of j?.docs ?? []) {
        if (doc?.cover_i) add(`https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`, "Open Library");
      }
    })(),

    // BnF — couverture via l'ARK de la notice (fonds FR)
    (async () => {
      for (const v of variants) {
        const xml = await getText(
          `https://catalogue.bnf.fr/api/SRU?version=1.2&operation=searchRetrieve&maximumRecords=1&query=${encodeURIComponent(
            `bib.isbn all "${v}"`,
          )}`,
        );
        const ark = xml?.match(/id="(ark:[^"]+)"/)?.[1];
        if (ark) {
          const url = `https://catalogue.bnf.fr/couverture?appName=NE&idArk=${ark}&couverture=1`;
          if (await isImage(url)) {
            add(url, "BnF");
            break;
          }
        }
      }
    })(),

    // Google Books — API volumes (clé requise pour éviter le 429)
    (async () => {
      const key = process.env.GOOGLE_BOOKS_API_KEY;
      type Vol = { volumeInfo?: { imageLinks?: { thumbnail?: string; smallThumbnail?: string } } };
      const j = await getJson<{ items?: Vol[] }>(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}${key ? `&key=${key}` : ""}`,
      );
      for (const it of (j?.items ?? []).slice(0, 3)) {
        const il = it?.volumeInfo?.imageLinks;
        add(cleanGoogle(il?.thumbnail || il?.smallThumbnail), "Google Books");
      }
    })(),

    // Google Books — Dynamic Links (sans clé) : miniature si dispo
    (async () => {
      const txt = await getText(
        `https://books.google.com/books?jscmd=viewapi&bibkeys=ISBN:${encodeURIComponent(isbn)}`,
      );
      const m = txt?.match(/"thumbnail_url":"([^"]+)"/);
      if (m) add(cleanGoogle(m[1]), "Google Books");
    })(),
  ]);

  return out.slice(0, 12);
}
