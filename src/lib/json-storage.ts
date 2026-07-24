import { promises as fs } from "fs";
import path from "path";
import { get, list, put } from "@vercel/blob";

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
 * Credenciales Blob en orden de preferencia:
 * 1. BLOB_READ_WRITE_TOKEN (estático, más fiable si OIDC falla)
 * 2. VERCEL_OIDC_TOKEN + BLOB_STORE_ID (automático en Vercel)
 */
function blobAuthOptions(): Record<string, string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (token) return { token };

  const storeId = process.env.BLOB_STORE_ID?.trim();
  const oidcToken = process.env.VERCEL_OIDC_TOKEN?.trim();
  if (storeId && oidcToken) return { storeId, oidcToken };
  if (storeId) return { storeId };

  return {};
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

/** Lectura por URL pública — no requiere token (blobs con access: public). */
async function readBlobJsonViaPublicUrl<T>(filename: string): Promise<T | null> {
  const auth = blobAuthOptions();
  if (Object.keys(auth).length === 0) return null;

  const { blobs } = await list({
    prefix: filename,
    limit: 20,
    ...auth,
  });

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
    if (isForbiddenBlobError(error) && process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
      throw new BlobReadError(
        `Lectura de Blob falló (${filename}): ${
          error instanceof Error ? error.message : "403 Forbidden"
        }`,
      );
    }

    if (isForbiddenBlobError(error)) {
      try {
        return await readBlobJsonViaPublicUrl<T>(filename);
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

  if (Object.keys(auth).length === 0) {
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

export function isUsingBlobStorage(): boolean {
  return useBlobStorage();
}

export function hasBlobWriteCredentials(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN?.trim() ||
      (process.env.BLOB_STORE_ID?.trim() &&
        process.env.VERCEL_OIDC_TOKEN?.trim()),
  );
}
