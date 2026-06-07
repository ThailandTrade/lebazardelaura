// Reclasse les livres actuellement en catégorie « autre » à partir de la suggestion
// de l'API ISBN (Google Books → suggestCategory). Ne touche jamais une catégorie
// déjà choisie. Usage :
//   node --env-file=.env.local scripts/recategorize.mjs --dry   (aperçu)
//   node --env-file=.env.local scripts/recategorize.mjs         (applique)
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const BASE = process.env.SELF_BASE_URL ?? "http://127.0.0.1:3000";
const dry = process.argv.includes("--dry");

const { rows } = await pool.query(
  "select id, isbn, title from books where category = 'autre' and isbn is not null order by created_at",
);
console.log(`${rows.length} livre(s) en « autre » avec ISBN${dry ? " — DRY RUN" : ""}\n`);

let updated = 0;
for (const b of rows) {
  let cat = null;
  try {
    const res = await fetch(`${BASE}/api/isbn/${encodeURIComponent(b.isbn)}`);
    if (res.ok) cat = (await res.json())?.data?.category ?? null;
  } catch {
    /* réseau : on saute */
  }
  if (cat && cat !== "autre") {
    console.log(`  ✓ ${b.title} → ${cat}`);
    if (!dry) await pool.query("update books set category = $2 where id = $1", [b.id, cat]);
    updated++;
  } else {
    console.log(`  – ${b.title} (rien d'exploitable)`);
  }
  await new Promise((r) => setTimeout(r, 400)); // politesse API
}

console.log(`\n${updated} reclassé(s)${dry ? " (dry-run, rien écrit)" : ""}`);
await pool.end();
