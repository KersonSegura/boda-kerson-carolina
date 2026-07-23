import { promises as fs } from "fs";
import path from "path";
import type { Category, CreateCategoryInput } from "@/types/category";

const DATA_PATH = path.join(process.cwd(), "data", "categories.json");

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function readCategoriesFile(): Promise<Category[]> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    return JSON.parse(raw) as Category[];
  } catch {
    return [];
  }
}

async function writeCategoriesFile(categories: Category[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(categories, null, 2), "utf-8");
}

export async function getAllCategories(): Promise<Category[]> {
  return readCategoriesFile();
}

export async function createCategory(
  input: CreateCategoryInput,
): Promise<Category | { error: string }> {
  const nombre = input.nombre.trim();
  if (!nombre) return { error: "El nombre es requerido" };

  const categories = await readCategoriesFile();
  const baseId = slugify(nombre) || "categoria";
  let id = baseId;
  let counter = 1;

  while (categories.some((c) => c.id === id)) {
    id = `${baseId}-${counter}`;
    counter++;
  }

  const category: Category = { id, nombre };
  categories.push(category);
  await writeCategoriesFile(categories);
  return category;
}

export async function deleteCategory(id: string): Promise<boolean> {
  const categories = await readCategoriesFile();
  const filtered = categories.filter((c) => c.id !== id);
  if (filtered.length === categories.length) return false;
  await writeCategoriesFile(filtered);
  return true;
}
