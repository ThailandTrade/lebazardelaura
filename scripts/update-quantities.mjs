// Restaure la quantité (colonne Stock du fichier) sur les livres déjà en base,
// par correspondance d'ISBN. Non destructif (ne touche que la colonne quantity).
//   node --env-file=.env.local scripts/update-quantities.mjs
import { Pool } from "pg";
import { readFileSync } from "node:fs";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL manquant (--env-file=.env.local).");
  process.exit(1);
}
function normIsbn(raw) {
  const c = (raw || "").replace(/[^0-9Xx]/g, "").toUpperCase();
  return /^(\d{9}[\dX]|\d{13})$/.test(c) ? c : null;
}

const lines = readFileSync("Inventaire.tsv", "utf8").replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.length);
const head = lines[0].split("\t");
const iIsbn = head.indexOf("ISBN");
const iStock = head.indexOf("Stock");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
let updated = 0;
try {
  for (const line of lines.slice(1)) {
    const f = line.split("\t");
    const isbn = normIsbn(f[iIsbn]);
    const stock = parseInt(f[iStock] || "0", 10) || 0;
    if (!isbn || stock <= 1) continue; // défaut déjà à 1
    const res = await pool.query("update books set quantity = $2 where isbn = $1", [isbn, stock]);
    updated += res.rowCount ?? 0;
  }
  console.log(`Quantités mises à jour (>1) : ${updated}`);
  const dist = await pool.query("select quantity, count(*) n from books group by quantity order by quantity desc limit 8");
  console.log("Répartition :", dist.rows.map((r) => `${r.quantity}×${r.n}`).join("  "));
} catch (e) {
  console.error("Échec :", e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
