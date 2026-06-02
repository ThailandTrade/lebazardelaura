// Importe l'inventaire réel depuis Inventaire.tsv.
// - PURGE la table books, puis insère uniquement les livres en stock (> 0).
// - Récupère couvertures + éditeur/pages/date via Open Library (par ISBN).
//
//   node --env-file=.env.local scripts/import-inventory.mjs
//
// Option --dry pour ne rien écrire en base (test parsing + lookups).

import { Pool } from "pg";
import { readFileSync } from "node:fs";

const DRY = process.argv.includes("--dry");
const FILE = "Inventaire.tsv";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL manquant (--env-file=.env.local).");
  process.exit(1);
}

// Catégorie fichier -> enum interne.
const CATEGORY_MAP = {
  "Romans": "roman",
  "Livres enfants": "jeunesse",
  "Romans jeunesse": "jeunesse",
  "BD / Mangas": "bd_manga",
  "Manuels scolaires": "scolaire_langues",
  "Livres en anglais": "autre",
  "Guides voyage": "documentaire",
  "Vintage": "autre",
  "Beaux livres": "art_beaux_livres",
  "Magazines": "magazine",
};

function normalizeIsbn(raw) {
  const c = (raw || "").replace(/[^0-9Xx]/g, "").toUpperCase();
  return /^(\d{9}[\dX]|\d{13})$/.test(c) ? c : null;
}

// "Nom, Prénom" -> "Prénom Nom" ; gère plusieurs auteurs séparés par ';'.
function parseAuthors(raw) {
  return (raw || "")
    .split(";")
    .map((a) => a.trim())
    .filter(Boolean)
    .map((a) => {
      const m = a.match(/^([^,]+),\s*(.+)$/);
      return m ? `${m[2].trim()} ${m[1].trim()}` : a;
    });
}

function parseTsv(text) {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.length);
  const head = lines[0].split("\t");
  const idx = (n) => head.indexOf(n);
  const C = {
    isbn: idx("ISBN"), stock: idx("Stock"), title: idx("Title"), price: idx("Price"),
    author: idx("Author"), cat: idx("Catégorie"), entre: idx("Entré le"),
    don: idx("Don / Rachat"), vendu: idx("Vendu le"),
  };
  return lines.slice(1).map((l) => {
    const f = l.split("\t");
    return {
      isbn: normalizeIsbn(f[C.isbn]),
      stock: parseInt(f[C.stock] || "0", 10) || 0,
      title: (f[C.title] || "").trim(),
      price: Number(f[C.price]) || 0,
      authors: parseAuthors(f[C.author]),
      catRaw: (f[C.cat] || "").trim(),
      entre: (f[C.entre] || "").trim(),
      don: (f[C.don] || "").trim(),
    };
  });
}

async function olBatch(isbns) {
  const out = {};
  if (!isbns.length) return out;
  const keys = isbns.map((i) => `ISBN:${i}`).join(",");
  const url = `https://openlibrary.org/api/books?bibkeys=${encodeURIComponent(keys)}&format=json&jscmd=data`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return out;
    const json = await res.json();
    for (const isbn of isbns) {
      const b = json[`ISBN:${isbn}`];
      if (!b) continue;
      out[isbn] = {
        cover: b.cover?.large || b.cover?.medium || null,
        publisher: Array.isArray(b.publishers) && b.publishers[0]?.name ? b.publishers[0].name : null,
        published_date: b.publish_date || null,
        page_count: Number.isFinite(b.number_of_pages) ? b.number_of_pages : null,
      };
    }
  } catch { /* on continue sans enrichissement */ }
  return out;
}

async function olIsbnCover(isbn) {
  try {
    const base = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
    const res = await fetch(`${base}?default=false`, { method: "HEAD" });
    return res.ok ? base : null;
  } catch { return null; }
}

async function pool_map(items, limit, fn) {
  const res = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const cur = i++;
        res[cur] = await fn(items[cur], cur);
      }
    }),
  );
  return res;
}

// --- main ---
const rows = parseTsv(readFileSync(FILE, "utf8"));
const inStock = rows.filter((r) => r.stock > 0 && r.title);
console.log(`Total fichier : ${rows.length} — en stock : ${inStock.length}`);

// Enrichissement Open Library par lots de 100 ISBN.
const withIsbn = inStock.filter((r) => r.isbn);
const enrich = {};
const BATCH = 100;
for (let i = 0; i < withIsbn.length; i += BATCH) {
  const chunk = withIsbn.slice(i, i + BATCH).map((r) => r.isbn);
  Object.assign(enrich, await olBatch(chunk));
  process.stdout.write(`\r  lookup OL : ${Math.min(i + BATCH, withIsbn.length)}/${withIsbn.length}`);
}
console.log("");

// Couverture de secours par ISBN pour ceux sans cover dans le batch.
const needCover = withIsbn.filter((r) => !enrich[r.isbn]?.cover);
let recovered = 0;
await pool_map(needCover, 10, async (r) => {
  const c = await olIsbnCover(r.isbn);
  if (c) {
    enrich[r.isbn] = { ...(enrich[r.isbn] || {}), cover: c };
    recovered++;
  }
});
const withCover = withIsbn.filter((r) => enrich[r.isbn]?.cover).length;
console.log(`Couvertures trouvées : ${withCover}/${inStock.length} (dont ${recovered} via secours ISBN)`);

if (DRY) {
  console.log("\n[dry] aucun écrit en base. Exemple :");
  console.log(inStock.slice(0, 3).map((r) => ({ ...r, ol: enrich[r.isbn] })));
  process.exit(0);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query("delete from books");
  console.log("Table books purgée.");

  let n = 0;
  for (const r of inStock) {
    const e = enrich[r.isbn] || {};
    const category = CATEGORY_MAP[r.catRaw] || "autre";
    const language = r.catRaw === "Livres en anglais" ? "en" : "fr";
    const notes = [r.don && `Provenance : ${r.don}`, r.entre && `Entré le ${r.entre}`]
      .filter(Boolean).join(" — ") || null;
    await pool.query(
      `insert into books
        (isbn,title,authors,publisher,published_date,cover_url,language,page_count,
         category,condition,price,status,notes,source)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'bon',$10,'disponible',$11,'inventaire')`,
      [
        r.isbn, r.title, r.authors, e.publisher ?? null, e.published_date ?? null,
        e.cover ?? null, language, e.page_count ?? null, category, r.price, notes,
      ],
    );
    n++;
  }
  console.log(`Inséré : ${n} livres (statut disponible).`);
} catch (err) {
  console.error("Échec :", err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
