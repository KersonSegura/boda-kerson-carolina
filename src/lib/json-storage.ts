import { promises as fs } from "fs";
import path from "path";
import { get, put } from "@vercel/blob";

function isVercel(): boolean {
  return process.env.VERCEL === "1";
}

function hasBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** En Vercel siempre Blob; en local Blob si hay token, si no archivos. */
function useBlobStorage(): boolean {
  return isVercel() || hasBlobToken();
}

function localFilePath(filename: string): string {
  return path.join(process.cwd(), "data", filename);
}

function blobPutOptions() {
  return {
    access: "public" as const,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    ...(hasBlobToken() ? { token: process.env.BLOB_READ_WRITE_TOKEN } : {}),
  };
}

function blobGetOptions() {
  return {
    access: "public" as const,
    useCache: false,
    ...(hasBlobToken() ? { token: process.env.BLOB_READ_WRITE_TOKEN } : {}),
  };
}

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

async function readBlobJson<T>(filename: string): Promise<T | null> {
  try {
    const result = await get(filename, blobGetOptions());
    if (!result || result.statusCode !== 200 || !result.stream) {
      return null;
    }
    const text = await new Response(result.stream).text();
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function writeBlobJson<T>(filename: string, data: T): Promise<void> {
  await put(filename, JSON.stringify(data, null, 2), blobPutOptions());
}

/** Lee JSON desde Blob (producción) o archivo local (desarrollo). */
export async function readJson<T>(filename: string): Promise<T | null> {
  if (useBlobStorage()) {
    return readBlobJson<T>(filename);
  }
  return readLocalJson<T>(filename);
}

/**
 * Lee JSON y, si no existe en Blob, inicializa desde el archivo del repositorio.
 */
export async function readJsonWithSeed<T>(filename: string): Promise<T> {
  if (useBlobStorage()) {
    const existing = await readBlobJson<T>(filename);
    if (existing !== null) return existing;

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

/** Escribe JSON en Blob o archivo local. */
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
