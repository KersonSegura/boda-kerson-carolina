import { promises as fs } from "fs";
import path from "path";
import type { Category } from "@/types/category";
import type { Gift } from "@/types/gift";
import { hasPostgres } from "@/lib/db";
import { resetCatalogFromSeed } from "@/lib/gifts-store";

const VERSION_FILENAME = "catalog-version.json";

interface CatalogVersion {
  version: number;
}

async function readSeedFile<T>(filename: string): Promise<T> {
  const filePath = path.join(process.cwd(), "data", filename);
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

export async function readSeedCategories(): Promise<Category[]> {
  return readSeedFile<Category[]>("categories.json");
}

async function readSeedVersion(): Promise<number> {
  const meta = await readSeedFile<CatalogVersion>(VERSION_FILENAME);
  return meta.version;
}

/** Solo para el botón manual en admin — nunca se llama en lecturas normales. */
export async function applySeedCatalog(): Promise<{
  giftCount: number;
  categoryCount: number;
  version: number;
}> {
  const [gifts, categories, seedVersion] = await Promise.all([
    readSeedFile<Gift[]>("gifts.json"),
    readSeedCategories(),
    readSeedVersion(),
  ]);

  const giftCount = await resetCatalogFromSeed(gifts);

  if (!hasPostgres()) {
    const { writeJson } = await import("@/lib/json-storage");
    await Promise.all([
      writeJson("categories.json", categories),
      writeJson(VERSION_FILENAME, { version: seedVersion }),
    ]);
  }

  return {
    giftCount,
    categoryCount: categories.length,
    version: seedVersion,
  };
}
