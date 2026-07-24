import type { Category, CreateCategoryInput } from "@/types/category";
import { hasPostgres } from "@/lib/db";
import {
  pgCreateCategory,
  pgDeleteCategory,
  pgGetAllCategories,
} from "@/lib/categories-store-pg";
import {
  createCategoryLocal,
  deleteCategoryLocal,
  getAllCategoriesLocal,
} from "@/lib/categories-store-local";

export async function getAllCategories(): Promise<Category[]> {
  if (hasPostgres()) {
    return pgGetAllCategories();
  }
  return getAllCategoriesLocal();
}

export async function createCategory(
  input: CreateCategoryInput,
): Promise<Category | { error: string }> {
  if (hasPostgres()) {
    return pgCreateCategory(input);
  }
  return createCategoryLocal(input);
}

export async function deleteCategory(id: string): Promise<boolean> {
  if (hasPostgres()) {
    return pgDeleteCategory(id);
  }
  return deleteCategoryLocal(id);
}
