import type { Category, CreateCategoryInput } from "@/types/category";
import { readJsonWithSeed, writeJson } from "@/lib/json-storage";

const FILENAME = "categories.json";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function readCategoriesFile(): Promise<Category[]> {
  return readJsonWithSeed<Category[]>(FILENAME);
}

async function writeCategoriesFile(categories: Category[]): Promise<void> {
  await writeJson(FILENAME, categories);
}

export async function getAllCategoriesLocal(): Promise<Category[]> {
  return readCategoriesFile();
}

export async function createCategoryLocal(
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

export async function deleteCategoryLocal(id: string): Promise<boolean> {
  const categories = await readCategoriesFile();
  const filtered = categories.filter((c) => c.id !== id);
  if (filtered.length === categories.length) return false;
  await writeCategoriesFile(filtered);
  return true;
}
