import { promises as fs } from "fs";
import path from "path";
import { del, get, list, put } from "@vercel/blob";

function isVercel(): boolean {
  return process.env.VERCEL === "1";
}

function hasBlobConfig(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      process.env.BLOB_STORE_ID ||
      process.env.VERCEL_OIDC_TOKEN,
  );
}

/** En Vercel siempre Blob (OIDC + BLOB_STORE_ID); en local archivos o Blob si hay token. */
function useBlobStorage(): boolean {
  return isVercel() || hasBlobConfig();
}

function localFilePath(filename: string): string {
  return path.join(process.cwd(), "data", filename);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Credenciales Blob.
 * En Vercel NO pasamos BLOB_READ_WRITE_TOKEN explícito: el SDK usa OIDC por defecto
 * y un token estático mal copiado provoca 403 aunque OIDC funcione.
 * Fuera de Vercel usamos el token estático o OIDC manual.
 */
function blobAuthOptions(): Record<string, string> {
  if (isVercel()) {
    return {};
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (token) return { token };

  const storeId = process.env.BLOB_STORE_ID?.trim();
  const oidcToken = process.env.VERCEL_OIDC_TOKEN?.trim();
  if (storeId && oidcToken) return { storeId, oidcToken };
  if (storeId) return { storeId };

  return {};
}

function resolveBlobStoreId(): string | null {
  const fromEnv = process.env.BLOB_STORE_ID?.trim();
  if (fromEnv) {
    return fromEnv.replace(/^store_/, "");
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (token) {
    const parts = token.split("_");
    if (parts[3]) return parts[3];
  }

  return null;
}

function publicBlobUrl(pathname: string): string | null {
  const storeId = resolveBlobStoreId();
  if (!storeId) return null;

  const encodedPath = pathname
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `https://${storeId}.public.blob.vercel-storage.com/${encodedPath}`;
}

const blobOptions = {
  access: "public" as const,
  addRandomSuffix: false,
  allowOverwrite: true,
  contentType: "application/json",
};

const blobReadOptions = {
  access: "public" as const,
  useCache: false,
};

async function readLocalJson<T>(filename: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(localFilePath(filename), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeLocalJson<T>(filename: string, data: T): Promise<void> {
  const filePath = localFilePath(filename);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export class BlobReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BlobReadError";
  }
}

function isRetryableBlobError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /429|5\d\d|fetch|timeout/i.test(message);
}

function isForbiddenBlobError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /403|forbidden/i.test(message);
}

/** Lectura directa por URL pública — sin token (stores public). */
async function readBlobJsonViaDirectPublicUrl<T>(
  filename: string,
): Promise<T | null> {
  const url = publicBlobUrl(filename);
  if (!url) return null;

  const response = await fetch(`${url}?v=${Date.now()}`, {
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new BlobReadError(
      `Lectura pública directa falló (${filename}): HTTP ${response.status}`,
    );
  }

  return (await response.json()) as T;
}

/** Lectura por URL pública vía list — requiere credenciales para listar. */
async function readBlobJsonViaPublicUrl<T>(filename: string): Promise<T | null> {
  const auth = blobAuthOptions();
  const listOptions =
    Object.keys(auth).length > 0
      ? { prefix: filename, limit: 20, ...auth }
      : { prefix: filename, limit: 20 };

  const { blobs } = await list(listOptions);

  const match = blobs.find((blob) => blob.pathname === filename);
  if (!match?.url) return null;

  const response = await fetch(`${match.url}?v=${Date.now()}`, {
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new BlobReadError(
      `Lectura pública de Blob falló (${filename}): HTTP ${response.status}`,
    );
  }

  return (await response.json()) as T;
}

async function readBlobJsonWithPublicFallback<T>(
  filename: string,
): Promise<T | null> {
  try {
    return await readBlobJsonViaDirectPublicUrl<T>(filename);
  } catch {
    return readBlobJsonViaPublicUrl<T>(filename);
  }
}

/** null = archivo no existe en Blob; error = fallo transitorio (no re-sembrar). */
async function readBlobJson<T>(
  filename: string,
  attempt = 0,
): Promise<T | null> {
  const maxAttempts = 3;

  try {
    const result = await get(filename, {
      ...blobReadOptions,
      ...blobAuthOptions(),
    });
    if (!result?.stream) {
      return null;
    }

    const text = await new Response(result.stream).text();
    return JSON.parse(text) as T;
  } catch (error) {
    if (isForbiddenBlobError(error)) {
      try {
        return await readBlobJsonWithPublicFallback<T>(filename);
      } catch (publicError) {
        throw new BlobReadError(
          `Lectura de Blob falló (${filename}): ${
            publicError instanceof Error ? publicError.message : "403 Forbidden"
          }. En Vercel → Storage → tu Blob → pestaña ".env.local" copia BLOB_READ_WRITE_TOKEN y agrégalo a las variables del proyecto, luego redeploy.`,
        );
      }
    }

    if (isRetryableBlobError(error) && attempt < maxAttempts - 1) {
      await sleep(250 * (attempt + 1));
      return readBlobJson<T>(filename, attempt + 1);
    }

    if (error instanceof BlobReadError) throw error;
    throw new BlobReadError(
      `Lectura de Blob falló (${filename}): ${
        error instanceof Error ? error.message : "error desconocido"
      }`,
    );
  }
}

async function writeBlobJson<T>(
  filename: string,
  data: T,
  attempt = 0,
): Promise<void> {
  const maxAttempts = 3;
  const auth = blobAuthOptions();

  if (Object.keys(auth).length === 0 && !isVercel() && !hasBlobConfig()) {
    throw new BlobReadError(
      "Escritura de Blob sin credenciales. Agrega BLOB_READ_WRITE_TOKEN desde Vercel → Storage → .env.local, o conecta el store al proyecto para OIDC.",
    );
  }

  try {
    await put(filename, JSON.stringify(data), {
      ...blobOptions,
      ...auth,
    });
  } catch (error) {
    if (isForbiddenBlobError(error)) {
      throw new BlobReadError(
        `Escritura de Blob falló (${filename}): 403 Forbidden. Ve a Vercel → Storage → "boda-kerson-carolina-blob" → pestaña ".env.local", copia BLOB_READ_WRITE_TOKEN y agrégalo en Settings → Environment Variables del proyecto. Luego redeploy.`,
      );
    }

    if (isRetryableBlobError(error) && attempt < maxAttempts - 1) {
      await sleep(250 * (attempt + 1));
      await writeBlobJson(filename, data, attempt + 1);
      return;
    }
    throw error;
  }
}

export async function readJson<T>(filename: string): Promise<T | null> {
  if (useBlobStorage()) {
    return readBlobJson<T>(filename);
  }
  return readLocalJson<T>(filename);
}

export async function readJsonWithSeed<T>(filename: string): Promise<T> {
  if (useBlobStorage()) {
    const existing = await readBlobJson<T>(filename);
    if (existing !== null) return existing;

    // Solo sembrar cuando el Blob no tiene el archivo, nunca por error de red.
    const seed = await readLocalJson<T>(filename);
    if (seed === null) {
      throw new Error(`No se encontró ${filename}`);
    }

    await writeBlobJson(filename, seed);
    return seed;
  }

  const local = await readLocalJson<T>(filename);
  if (local === null) {
    throw new Error(`No se encontró ${filename}`);
  }
  return local;
}

export async function writeJson<T>(filename: string, data: T): Promise<void> {
  if (useBlobStorage()) {
    await writeBlobJson(filename, data);
    return;
  }
  await writeLocalJson(filename, data);
}

export async function deleteJson(filename: string): Promise<void> {
  if (useBlobStorage()) {
    try {
      await del(filename, blobAuthOptions());
    } catch {
      // Ignorar si el archivo ya no existe.
    }
    return;
  }

  try {
    await fs.unlink(localFilePath(filename));
  } catch {
    // Ignorar si el archivo ya no existe.
  }
}

export async function listPathnames(prefix: string): Promise<string[]> {
  if (useBlobStorage()) {
    try {
      const { blobs } = await list({
        prefix,
        limit: 1000,
        ...blobAuthOptions(),
      });
      return blobs.map((blob) => blob.pathname);
    } catch (error) {
      if (!isForbiddenBlobError(error)) throw error;
      // Sin list auth: inferir paths conocidos del manifiesto si existe.
      if (prefix === "gifts/" || prefix === "reservations/") {
        return [];
      }
      throw error;
    }
  }

  const dir = localFilePath(prefix);
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const normalizedPrefix = prefix.endsWith("/") ? prefix : `${prefix}/`;
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => `${normalizedPrefix}${entry.name}`);
  } catch {
    return [];
  }
}

export function isUsingBlobStorage(): boolean {
  return useBlobStorage();
}

export function hasBlobWriteCredentials(): boolean {
  if (isVercel() && process.env.BLOB_STORE_ID?.trim()) return true;

  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN?.trim() ||
      (process.env.BLOB_STORE_ID?.trim() &&
        process.env.VERCEL_OIDC_TOKEN?.trim()),
  );
}
