import { sql } from "@vercel/postgres";

let schemaPromise: Promise<void> | null = null;

export function hasPostgres(): boolean {
  return Boolean(process.env.POSTGRES_URL?.trim());
}

export async function ensureSchema(): Promise<void> {
  if (!hasPostgres()) return;

  if (!schemaPromise) {
    schemaPromise = initSchema();
  }
  await schemaPromise;
}

async function initSchema(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS gifts (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      emoji TEXT NOT NULL DEFAULT '',
      especificaciones TEXT NOT NULL DEFAULT '',
      cantidad INTEGER NOT NULL DEFAULT 1,
      categoria_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS reservations (
      id BIGSERIAL PRIMARY KEY,
      gift_id TEXT NOT NULL REFERENCES gifts(id) ON DELETE CASCADE,
      nombre TEXT NOT NULL,
      reservado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      request_id TEXT
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS reservations_gift_id_idx ON reservations(gift_id)
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS reservations_request_id_idx
    ON reservations(request_id)
    WHERE request_id IS NOT NULL
  `;
}

export { sql };
