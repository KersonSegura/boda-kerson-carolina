import { promises as fs } from "fs";
import path from "path";
import type { Category } from "@/types/category";
import type { Gift } from "@/types/gift";
import { writeJson } from "@/lib/json-storage";

async function readSeedFile<T>(filename: string): Promise<T> {
  const filePath = path.join(process.cwd(), "data", filename);
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

export async function applySeedCatalog(): Promise<{
  giftCount: number;
  categoryCount: number;
}> {
  const [gifts, categories] = await Promise.all([
    readSeedFile<Gift[]>("gifts.json"),
    readSeedFile<Category[]>("categories.json"),
  ]);

  await Promise.all([
    writeJson("gifts.json", gifts),
    writeJson("categories.json", categories),
  ]);

  return { giftCount: gifts.length, categoryCount: categories.length };
}
