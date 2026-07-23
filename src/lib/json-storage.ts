import { promises as fs } from "fs";
import path from "path";
import { get, put } from "@vercel/blob";

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

/** El SDK lee BLOB_STORE_ID + VERCEL_OIDC_TOKEN automáticamente en Vercel. */
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

async function readBlobJson<T>(filename: string): Promise<T | null> {
  try {
    const result = await get(filename, blobReadOptions);
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
  await put(filename, JSON.stringify(data, null, 2), blobOptions);
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
