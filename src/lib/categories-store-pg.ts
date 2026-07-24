import type { Category, CreateCategoryInput } from "@/types/category";
import { ensureSchema, sql } from "@/lib/db";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function pgGetAllCategories(): Promise<Category[]> {
  await ensureSchema();

  const { rows } = await sql<Category>`
    SELECT id, nombre
    FROM categories
    ORDER BY nombre ASC
  `;

  return rows;
}

export async function pgCreateCategory(
  input: CreateCategoryInput,
): Promise<Category | { error: string }> {
  await ensureSchema();

  const nombre = input.nombre.trim();
  if (!nombre) return { error: "El nombre es requerido" };

  const categories = await pgGetAllCategories();
  const baseId = slugify(nombre) || "categoria";
  let id = baseId;
  let counter = 1;

  while (categories.some((c) => c.id === id)) {
    id = `${baseId}-${counter}`;
    counter += 1;
  }

  const category: Category = { id, nombre };
  await sql`
    INSERT INTO categories (id, nombre)
    VALUES (${category.id}, ${category.nombre})
  `;

  return category;
}

export async function pgDeleteCategory(id: string): Promise<boolean> {
  await ensureSchema();
  const { rowCount } = await sql`DELETE FROM categories WHERE id = ${id}`;
  return (rowCount ?? 0) > 0;
}
