import { Pool, type QueryResultRow } from "pg";

// Process long (pas de serverless) → on garde un pool ouvert et partagé.
// En dev, le HMR ré-évalue les modules : on mémorise le pool sur globalThis
// pour ne pas accumuler les pools / connexions à chaque rechargement.
declare global {
  var __bazarPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL manquant (voir .env.local).");
  }
  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
  });
}

export const pool: Pool = globalThis.__bazarPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalThis.__bazarPool = pool;
}

/** Requête paramétrée (jamais de concaténation SQL). */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: ReadonlyArray<unknown>,
): Promise<T[]> {
  const res = await pool.query<T>(text, params as unknown[] | undefined);
  return res.rows;
}
