// Complète les couvertures manquantes des livres déjà en base.
//
//   node --env-file=.env.local scripts/backfill-covers.mjs [--concurrency=N] [--delay=ms]
//
// Stratégie par livre (s'arrête au premier succès) :
//   1. Dilicom/epagine : couverture éditeur par EAN-13 (FR, sans quota) — prioritaire
//   2. Google Books par ISBN  — seulement si GOOGLE_BOOKS_API_KEY est défini
//   3. BnF : notice SRU (ISBN-13/10) -> couverture via ARK (fonds FR, dépôt légal)
//   4. Open Library : recherche par titre + auteur (cover_i)
//
// Idempotent : ne touche qu'aux livres dont cover_url est NULL. Relançable.
// IMPORTANT : la BnF bloque l'IP si on l'interroge trop vite. Sans clé Google,
// le script reste volontairement lent (faible concurrence + délai). Soyez patient.

import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL manquant (--env-file=.env.local).");
  process.exit(1);
}
const KEY = process.env.GOOGLE_BOOKS_API_KEY || null;
const arg = (name, def) => {
  const m = process.argv.find((a) => a.startsWith(`--${name}=`));
  return m ? Number(m.split("=")[1]) : def;
};
// Sans clé on dépend de la BnF → on reste doux (sinon blocage IP).
// epagine traite la majorité (sans quota) → la BnF n'est sollicitée que pour les
// rares cas restants, on peut donc être un peu moins lent qu'avant.
const CONCURRENCY = arg("concurrency", KEY ? 8 : 5);
const DELAY = arg("delay", KEY ? 0 : 150);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const UA = "LeBazarDeLaura/1.0 (vitrine librairie d'occasion; contact: emmanuel.riff@gmail.com)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function safeFetch(url, { timeout = 10_000, headers = {} } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    return await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": UA, ...headers } });
  } finally {
    clearTimeout(t);
  }
}

function cleanGoogle(url) {
  if (!url) return null;
  return url.replace(/^http:\/\//, "https://").replace(/&edge=curl/gi, "").replace(/([?&])zoom=\d+/i, "$1zoom=2");
}

async function googleCover(isbn) {
  if (!KEY || !isbn) return null;
  try {
    const r = await safeFetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${KEY}`);
    if (!r.ok) return null;
    const j = await r.json();
    const il = j.items?.[0]?.volumeInfo?.imageLinks;
    return cleanGoogle(il?.thumbnail || il?.smallThumbnail);
  } catch { return null; }
}

// Dilicom / epagine — couverture éditeur par EAN-13, sans clé ni quota (fonds FR).
// Placeholder = PNG 2687o → on n'accepte que les JPEG.
async function epagineCover(isbn) {
  if (!isbn || isbn.length !== 13) return null;
  const url = `https://images.epagine.fr/${isbn.slice(-3)}/${isbn}_1_75.jpg`;
  try {
    const r = await safeFetch(url, { headers: { Range: "bytes=0-0" } });
    if (r.ok && (r.headers.get("content-type") || "").includes("jpeg")) return url;
  } catch { /* suivant */ }
  return null;
}

function isbn13to10(i13) {
  if (!/^978\d{10}$/.test(i13)) return null;
  const core = i13.slice(3, 12);
  let s = 0; for (let k = 0; k < 9; k++) s += (10 - k) * Number(core[k]);
  const c = (11 - (s % 11)) % 11; return core + (c === 10 ? "X" : String(c));
}

// BnF : notice via SRU (ISBN-13 puis ISBN-10), couverture via l'ARK (si image).
// Un retry après pause en cas d'échec réseau (la BnF coupe quand on insiste).
async function bnfCover(isbn) {
  if (!isbn) return null;
  const SRU = "https://catalogue.bnf.fr/api/SRU?version=1.2&operation=searchRetrieve&maximumRecords=1&query=";
  for (const v of [isbn, isbn13to10(isbn)].filter(Boolean)) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await safeFetch(SRU + encodeURIComponent(`bib.isbn all "${v}"`));
        if (!r.ok) break;
        const ark = (await r.text()).match(/id="(ark:[^"]+)"/);
        if (!ark) break;
        const url = `https://catalogue.bnf.fr/couverture?appName=NE&idArk=${ark[1]}&couverture=1`;
        const c = await safeFetch(url);
        if (c.ok && (c.headers.get("content-type") || "").startsWith("image/")) return url;
        break;
      } catch {
        await sleep(1500); // pause avant retry (probable throttling BnF)
      }
    }
  }
  return null;
}

async function olSearchCover(title, authors) {
  if (!title) return null;
  const author = (authors?.[0] || "").trim();
  const q = `title=${encodeURIComponent(title)}` + (author ? `&author=${encodeURIComponent(author)}` : "");
  try {
    const r = await safeFetch(`https://openlibrary.org/search.json?${q}&fields=cover_i&limit=1`);
    if (!r.ok) return null;
    const j = await r.json();
    const id = j.docs?.[0]?.cover_i;
    return id ? `https://covers.openlibrary.org/b/id/${id}-L.jpg` : null;
  } catch { return null; }
}

async function poolMap(items, limit, delay, fn) {
  let i = 0, done = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const cur = i++;
        await fn(items[cur]);
        if (delay) await sleep(delay);
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
console.log(`Google Books : ${KEY ? "OUI (clé)" : "non"} | concurrence ${CONCURRENCY} | délai ${DELAY}ms`);

let updated = 0;
try {
  await poolMap(rows, CONCURRENCY, DELAY, async (b) => {
    const cover =
      (await epagineCover(b.isbn)) ||
      (await googleCover(b.isbn)) ||
      (await bnfCover(b.isbn)) ||
      (await olSearchCover(b.title, b.authors));
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
