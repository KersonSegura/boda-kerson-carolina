import postgres from "postgres";

let schemaPromise: Promise<void> | null = null;
let sqlInstance: ReturnType<typeof postgres> | null = null;

export function resolvePostgresUrl(): string | null {
  const direct =
    process.env.POSTGRES_URL?.trim() ||
    process.env.POSTGRES_PRISMA_URL?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim();

  if (direct) return direct;

  const host = process.env.POSTGRES_HOST?.trim();
  const user = process.env.POSTGRES_USER?.trim();
  const password = process.env.POSTGRES_PASSWORD?.trim();
  const database = process.env.POSTGRES_DATABASE?.trim() || "postgres";

  if (host && user && password) {
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}/${database}?sslmode=require`;
  }

  return null;
}

export function hasPostgres(): boolean {
  return resolvePostgresUrl() !== null;
}

export function isVercelRuntime(): boolean {
  return process.env.VERCEL === "1";
}

/** En Vercel usamos Postgres; Blob ya no se usa en producción. */
export function shouldUsePostgres(): boolean {
  if (hasPostgres()) return true;
  return isVercelRuntime() && Boolean(process.env.POSTGRES_HOST?.trim());
}

export function getSql(): ReturnType<typeof postgres> {
  if (!sqlInstance) {
    const url = resolvePostgresUrl();
    if (!url) {
      throw new Error(
        "POSTGRES_URL no configurada. Revisa la integración Supabase en Vercel.",
      );
    }

    sqlInstance = postgres(url, {
      ssl: "require",
      /** Obligatorio con el pooler de Supabase (POSTGRES_URL en Vercel). */
      prepare: false,
      max: 1,
      idle_timeout: 5,
      connect_timeout: 15,
      max_lifetime: 60 * 10,
      onnotice: () => {},
    });
  }

  return sqlInstance;
}

export async function ensureSchema(): Promise<void> {
  if (!shouldUsePostgres()) return;

  if (!schemaPromise) {
    schemaPromise = initSchema();
  }
  await schemaPromise;
}

async function initSchema(): Promise<void> {
  const sql = getSql();

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

export { postgres };
