// Crée (ou met à jour le mot de passe d') un compte admin pour Laura.
//
// Usage :
//   node --env-file=.env.local scripts/create-admin.mjs <email> <motdepasse>
// ou via variables d'env ADMIN_EMAIL / ADMIN_PASSWORD.
//
// Le mot de passe est hashé en bcrypt ; on n'enregistre jamais le clair.

import { Pool } from "pg";
import bcrypt from "bcryptjs";

const email = (process.argv[2] ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const password = process.argv[3] ?? process.env.ADMIN_PASSWORD ?? "";

if (!email || !password) {
  console.error("Usage: node --env-file=.env.local scripts/create-admin.mjs <email> <motdepasse>");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL manquant (lancer avec --env-file=.env.local).");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const hash = await bcrypt.hash(password, 12);
  const { rows } = await pool.query(
    `insert into admin_users (email, password_hash)
       values ($1, $2)
     on conflict (email) do update set password_hash = excluded.password_hash
     returning id, email`,
    [email, hash],
  );
  console.log("Compte admin prêt :", rows[0]);
} catch (err) {
  console.error("Échec :", err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
