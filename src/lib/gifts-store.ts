import type { CreateGiftInput, Gift, UpdateGiftInput } from "@/types/gift";
import { shouldUsePostgres } from "@/lib/db";
import {
  pgCountGifts,
  pgCreateGift,
  pgDeleteGift,
  pgGetAllGifts,
  pgGetGiftById,
  pgReserveGift,
  pgResetCatalogFromSeed,
  pgUpdateGift,
} from "@/lib/gifts-store-pg";
import {
  createGiftLocal,
  deleteGiftLocal,
  getAllGiftsLocal,
  getGiftByIdLocal,
  reserveGiftLocal,
  resetCatalogFromSeedLocal,
  updateGiftLocal,
} from "@/lib/gifts-store-local";

type RawGiftRow = Parameters<
  typeof import("@/lib/gift-model").normalizeGift
>[0];

async function seedIfEmpty(): Promise<void> {
  if (!shouldUsePostgres()) return;

  const count = await pgCountGifts();
  if (count > 0) return;

  const { applySeedCatalog } = await import("@/lib/seed-catalog");
  const seeded = await applySeedCatalog();
  console.info(
    `Catálogo vacío: se sembraron ${seeded.giftCount} regalos y ${seeded.categoryCount} categorías.`,
  );
}

export async function getAllGifts(): Promise<Gift[]> {
  if (shouldUsePostgres()) {
    await seedIfEmpty();
    return pgGetAllGifts();
  }
  return getAllGiftsLocal();
}

export async function getGiftById(id: string): Promise<Gift | undefined> {
  if (shouldUsePostgres()) {
    return pgGetGiftById(id);
  }
  return getGiftByIdLocal(id);
}

export async function createGift(input: CreateGiftInput): Promise<Gift> {
  if (shouldUsePostgres()) {
    return pgCreateGift(input);
  }
  return createGiftLocal(input);
}

export async function updateGift(
  id: string,
  input: UpdateGiftInput,
): Promise<Gift | null> {
  if (shouldUsePostgres()) {
    return pgUpdateGift(id, input);
  }
  return updateGiftLocal(id, input);
}

export async function deleteGift(id: string): Promise<boolean> {
  if (shouldUsePostgres()) {
    return pgDeleteGift(id);
  }
  return deleteGiftLocal(id);
}

export async function reserveGift(
  id: string,
  nombre: string,
  requestId?: string,
): Promise<{ gift: Gift } | { error: string }> {
  if (shouldUsePostgres()) {
    return pgReserveGift(id, nombre, requestId);
  }
  return reserveGiftLocal(id, nombre, requestId);
}

export async function resetCatalogFromSeed(rows: RawGiftRow[]): Promise<number> {
  if (shouldUsePostgres()) {
    const { readSeedCategories } = await import("@/lib/seed-catalog");
    const categories = await readSeedCategories();
    return pgResetCatalogFromSeed(rows, categories);
  }
  return resetCatalogFromSeedLocal(rows);
}
