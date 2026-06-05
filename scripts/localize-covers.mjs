// Rapatrie en local (WebP redimensionné) toutes les couvertures encore externes.
// Optimise stockage + affichage (plus de hotlink lent). Idempotent, relançable.
//   node --env-file=.env.local scripts/localize-covers.mjs [--concurrency=N]
import { Pool } from "pg";
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL manquant (--env-file=.env.local).");
  process.exit(1);
}
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads/covers";
const PUBLIC_BASE = process.env.NEXT_PUBLIC_UPLOAD_BASE_URL ?? "/uploads/covers";
const CONCURRENCY = Number((process.argv.find((a) => a.startsWith("--concurrency=")) || "").split("=")[1]) || 4;
const COVER_WIDTH = 600;

async function localize(url) {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10_000);
    const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "LeBazarDeLaura/1.0" } });
    clearTimeout(t);
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") || "").startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength < 1000) return null;
    const out = await sharp(buf).rotate().resize({ width: COVER_WIDTH, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    const filename = `${randomUUID()}.webp`;
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, filename), out);
    return { url: `${PUBLIC_BASE}/${filename}`, bytes: out.byteLength };
  } catch {
    return null;
  }
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const { rows } = await pool.query(
  "select id, cover_url from books where cover_url is not null and cover_url ~ '^https?://' order by created_at",
);
console.log(`Couvertures externes à rapatrier : ${rows.length} (concurrence ${CONCURRENCY})`);

let done = 0, ok = 0, totalBytes = 0;
async function worker(items) {
  for (const b of items) {
    const r = await localize(b.cover_url);
    if (r) {
      await pool.query("update books set cover_url = $2 where id = $1", [b.id, r.url]);
      ok++;
      totalBytes += r.bytes;
    }
    if (++done % 25 === 0) process.stdout.write(`\r  ${done}/${rows.length}`);
  }
}
try {
  const chunks = Array.from({ length: CONCURRENCY }, () => []);
  rows.forEach((r, i) => chunks[i % CONCURRENCY].push(r));
  await Promise.all(chunks.map(worker));
  process.stdout.write(`\r  ${rows.length}/${rows.length}\n`);
  console.log(`Rapatriées : ${ok}/${rows.length} | poids moyen WebP : ${ok ? Math.round(totalBytes / ok / 1024) : 0} Ko`);
} catch (e) {
  console.error("Échec :", e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
