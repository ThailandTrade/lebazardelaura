// Complète les couvertures manquantes des livres déjà en base.
//
//   node --env-file=.env.local scripts/backfill-covers.mjs
//
// Stratégie par livre (s'arrête au premier succès) :
//   1. Google Books par ISBN  — seulement si GOOGLE_BOOKS_API_KEY est défini
//   2. BnF : notice SRU (ISBN-13/10) -> couverture via ARK (fonds FR, dépôt légal)
//   3. Open Library : recherche par titre + auteur (cover_i)
//
// Idempotent : ne touche qu'aux livres dont cover_url est NULL. Relançable.

import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL manquant (--env-file=.env.local).");
  process.exit(1);
}
const KEY = process.env.GOOGLE_BOOKS_API_KEY || null;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function cleanGoogle(url) {
  if (!url) return null;
  return url.replace(/^http:\/\//, "https://").replace(/&edge=curl/gi, "").replace(/([?&])zoom=\d+/i, "$1zoom=2");
}

async function googleCover(isbn) {
  if (!KEY || !isbn) return null;
  try {
    const r = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${KEY}`);
    if (!r.ok) return null;
    const j = await r.json();
    const il = j.items?.[0]?.volumeInfo?.imageLinks;
    return cleanGoogle(il?.thumbnail || il?.smallThumbnail);
  } catch { return null; }
}

function isbn13to10(i13) {
  if (!/^978\d{10}$/.test(i13)) return null;
  const core = i13.slice(3, 12);
  let s = 0; for (let k = 0; k < 9; k++) s += (10 - k) * Number(core[k]);
  const c = (11 - (s % 11)) % 11; return core + (c === 10 ? "X" : String(c));
}

// BnF : notice via SRU (ISBN-13 puis ISBN-10), couverture via l'ARK (si image).
async function bnfCover(isbn) {
  if (!isbn) return null;
  const SRU = "https://catalogue.bnf.fr/api/SRU?version=1.2&operation=searchRetrieve&maximumRecords=1&query=";
  for (const v of [isbn, isbn13to10(isbn)].filter(Boolean)) {
    try {
      const r = await fetch(SRU + encodeURIComponent(`bib.isbn all "${v}"`));
      if (!r.ok) continue;
      const ark = (await r.text()).match(/id="(ark:[^"]+)"/);
      if (!ark) continue;
      const url = `https://catalogue.bnf.fr/couverture?appName=NE&idArk=${ark[1]}&couverture=1`;
      const c = await fetch(url);
      if (c.ok && (c.headers.get("content-type") || "").startsWith("image/")) return url;
    } catch { /* suivant */ }
  }
  return null;
}

async function olSearchCover(title, authors) {
  if (!title) return null;
  const author = (authors?.[0] || "").trim();
  const q = `title=${encodeURIComponent(title)}` + (author ? `&author=${encodeURIComponent(author)}` : "");
  try {
    const r = await fetch(`https://openlibrary.org/search.json?${q}&fields=cover_i&limit=1`);
    if (!r.ok) return null;
    const j = await r.json();
    const id = j.docs?.[0]?.cover_i;
    return id ? `https://covers.openlibrary.org/b/id/${id}-L.jpg` : null;
  } catch { return null; }
}

async function poolMap(items, limit, fn) {
  let i = 0, done = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const cur = i++;
        await fn(items[cur]);
        if (++done % 25 === 0) process.stdout.write(`\r  traités : ${done}/${items.length}`);
      }
    }),
  );
  process.stdout.write(`\r  traités : ${items.length}/${items.length}\n`);
}

const { rows } = await pool.query(
  "select id, isbn, title, authors from books where cover_url is null order by created_at",
);
console.log(`Livres sans couverture : ${rows.length}`);
console.log(`Source Google Books : ${KEY ? "OUI (clé présente)" : "non (pas de clé)"}`);

let updated = 0;
try {
  await poolMap(rows, KEY ? 6 : 6, async (b) => {
    const cover =
      (await googleCover(b.isbn)) || (await bnfCover(b.isbn)) || (await olSearchCover(b.title, b.authors));
    if (cover) {
      await pool.query("update books set cover_url = $2 where id = $1", [b.id, cover]);
      updated++;
    }
  });
  const after = (await pool.query("select count(*) c from books where cover_url is not null")).rows[0].c;
  const total = (await pool.query("select count(*) c from books")).rows[0].c;
  console.log(`\nNouvelles couvertures : +${updated}`);
  console.log(`Couvertures totales : ${after}/${total}`);
} catch (err) {
  console.error("Échec :", err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
