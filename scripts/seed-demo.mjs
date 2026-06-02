// Peuple la base avec ~100 vrais livres français (données Open Library Search),
// avec prix / états / statuts variés pour un aperçu réaliste.
//
//   node --env-file=.env.local scripts/seed-demo.mjs
//
// Option : --reset pour vider la table books avant d'insérer.

import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL manquant (lancer avec --env-file=.env.local).");
  process.exit(1);
}
const reset = process.argv.includes("--reset");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Mapping catégorie interne -> sujet Open Library + fourchette de prix (฿).
const PLAN = [
  { category: "roman", subject: "fiction", target: 14, prices: [120, 150, 180] },
  { category: "polar_thriller", subject: "detective_and_mystery_stories", target: 10, prices: [120, 150, 180] },
  { category: "sf_fantasy", subject: "science_fiction", target: 10, prices: [120, 150, 180] },
  { category: "bd_manga", subject: "comics_and_graphic_novels", target: 10, prices: [80, 120, 150] },
  { category: "jeunesse", subject: "juvenile_fiction", target: 10, prices: [80, 120] },
  { category: "documentaire", subject: "history", target: 9, prices: [150, 180] },
  { category: "essai_bio", subject: "biography", target: 9, prices: [150, 180] },
  { category: "cuisine_loisirs", subject: "cooking", target: 7, prices: [150, 180, 230] },
  { category: "art_beaux_livres", subject: "art", target: 7, prices: [180, 230] },
  { category: "poesie_theatre", subject: "poetry", target: 7, prices: [80, 120, 150] },
  { category: "scolaire_langues", subject: "french_language", target: 6, prices: [120, 150] },
];

const CONDITIONS = [
  ["bon", 0.4], ["tres_bon", 0.3], ["comme_neuf", 0.15], ["correct", 0.1], ["neuf", 0.05],
];
const STATUSES = [
  ["disponible", 0.8], ["reserve", 0.1], ["vendu", 0.05], ["masque", 0.05],
];

function weighted(pairs) {
  const r = Math.random();
  let acc = 0;
  for (const [val, w] of pairs) {
    acc += w;
    if (r <= acc) return val;
  }
  return pairs[pairs.length - 1][0];
}
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function pickIsbn13(isbns) {
  if (!Array.isArray(isbns)) return null;
  const clean = isbns.map((x) => String(x).replace(/[^0-9Xx]/g, ""));
  return clean.find((x) => x.length === 13) ?? clean.find((x) => x.length === 10) ?? null;
}

async function fetchSubject(subject, limit) {
  const url =
    `https://openlibrary.org/search.json?q=${encodeURIComponent(`language:fre subject:${subject}`)}` +
    `&fields=title,author_name,isbn,cover_i,first_publish_year,publisher,number_of_pages_median` +
    `&limit=${limit}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray(json.docs) ? json.docs : [];
}

const seenTitles = new Set();
const seenIsbn = new Set();
const books = [];

for (const plan of PLAN) {
  const docs = await fetchSubject(plan.subject, 60);
  let added = 0;
  for (const d of docs) {
    if (added >= plan.target) break;
    if (!d.title || !d.cover_i) continue; // on veut une couverture
    const titleKey = d.title.trim().toLowerCase();
    if (seenTitles.has(titleKey)) continue;
    const isbn = pickIsbn13(d.isbn);
    if (isbn && seenIsbn.has(isbn)) continue;

    seenTitles.add(titleKey);
    if (isbn) seenIsbn.add(isbn);

    books.push({
      isbn,
      title: d.title.slice(0, 300),
      subtitle: null,
      authors: Array.isArray(d.author_name) ? d.author_name.slice(0, 3) : [],
      publisher: Array.isArray(d.publisher) ? d.publisher[0] : null,
      published_date: d.first_publish_year ? String(d.first_publish_year) : null,
      description: null,
      cover_url: `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg`,
      language: "fr",
      page_count: Number.isFinite(d.number_of_pages_median) ? d.number_of_pages_median : null,
      category: plan.category,
      condition: weighted(CONDITIONS),
      price: pick(plan.prices),
      status: weighted(STATUSES),
      source: "open_library",
    });
    added++;
  }
  console.log(`  ${plan.category}: +${added}`);
}

console.log(`\nTotal collecté : ${books.length} livres`);

try {
  if (reset) {
    await pool.query("delete from books");
    console.log("Table books vidée (--reset).");
  }
  let inserted = 0;
  for (const b of books) {
    await pool.query(
      `insert into books
        (isbn, title, subtitle, authors, publisher, published_date, description,
         cover_url, language, page_count, category, condition, price, status, source)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        b.isbn, b.title, b.subtitle, b.authors, b.publisher, b.published_date, b.description,
        b.cover_url, b.language, b.page_count, b.category, b.condition, b.price, b.status, b.source,
      ],
    );
    inserted++;
  }
  console.log(`Inséré : ${inserted} livres.`);
} catch (err) {
  console.error("Échec :", err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
