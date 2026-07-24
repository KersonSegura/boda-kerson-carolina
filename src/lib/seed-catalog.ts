import { promises as fs } from "fs";
import path from "path";
import type { Category } from "@/types/category";
import type { Gift } from "@/types/gift";
import { readJson, writeJson } from "@/lib/json-storage";

const VERSION_FILENAME = "catalog-version.json";

interface CatalogVersion {
  version: number;
}

async function readSeedFile<T>(filename: string): Promise<T> {
  const filePath = path.join(process.cwd(), "data", filename);
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

async function readSeedVersion(): Promise<number> {
  const meta = await readSeedFile<CatalogVersion>(VERSION_FILENAME);
  return meta.version;
}

async function readStoredVersion(): Promise<number> {
  const stored = await readJson<CatalogVersion>(VERSION_FILENAME);
  if (stored?.version) return stored.version;

  // Ya hay regalos en Blob pero sin versión: no resetear (preserva emojis y ediciones).
  const existingGifts = await readJson<Gift[]>("gifts.json");
  if (existingGifts && existingGifts.length > 0) {
    const seedVersion = await readSeedVersion();
    await writeJson(VERSION_FILENAME, { version: seedVersion });
    return seedVersion;
  }

  return 0;
}

/** Aplica la plantilla del repo si el deploy trae una versión más nueva que Blob. */
export async function ensureCatalogSynced(): Promise<void> {
  const [seedVersion, storedVersion] = await Promise.all([
    readSeedVersion(),
    readStoredVersion(),
  ]);

  if (seedVersion <= storedVersion) return;

  await applySeedCatalog(seedVersion);
}

export async function applySeedCatalog(
  version?: number,
): Promise<{
  giftCount: number;
  categoryCount: number;
  version: number;
}> {
  const [gifts, categories, seedVersion] = await Promise.all([
    readSeedFile<Gift[]>("gifts.json"),
    readSeedFile<Category[]>("categories.json"),
    version !== undefined ? Promise.resolve(version) : readSeedVersion(),
  ]);

  await Promise.all([
    writeJson("gifts.json", gifts),
    writeJson("categories.json", categories),
    writeJson(VERSION_FILENAME, { version: seedVersion }),
  ]);

  return {
    giftCount: gifts.length,
    categoryCount: categories.length,
    version: seedVersion,
  };
}
