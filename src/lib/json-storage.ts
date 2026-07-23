import { promises as fs } from "fs";
import path from "path";
import { list, put } from "@vercel/blob";

const BLOB_TOKEN = () => process.env.BLOB_READ_WRITE_TOKEN;

function useBlobStorage(): boolean {
  return Boolean(BLOB_TOKEN());
}

function localFilePath(filename: string): string {
  return path.join(process.cwd(), "data", filename);
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
  const token = BLOB_TOKEN();
  if (!token) return null;

  const { blobs } = await list({ prefix: filename, limit: 1, token });
  if (blobs.length === 0) return null;

  const response = await fetch(blobs[0].url, {
    headers: { authorization: `Bearer ${token}` },
  });

  if (!response.ok) return null;
  return (await response.json()) as T;
}

async function writeBlobJson<T>(filename: string, data: T): Promise<void> {
  const token = BLOB_TOKEN();
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN no configurado");
  }

  await put(filename, JSON.stringify(data, null, 2), {
    access: "private",
    addRandomSuffix: false,
    contentType: "application/json",
    token,
  });
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
  const existing = await readJson<T>(filename);
  if (existing !== null) return existing;

  const seed = await readLocalJson<T>(filename);
  if (seed === null) {
    throw new Error(`No se encontró ${filename}`);
  }

  if (useBlobStorage()) {
    await writeBlobJson(filename, seed);
  }

  return seed;
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
