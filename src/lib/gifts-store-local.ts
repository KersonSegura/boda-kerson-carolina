import type { CreateGiftInput, Gift, GiftReservation, UpdateGiftInput } from "@/types/gift";
import { normalizeGiftEmoji } from "@/lib/gift-emoji";
import {
  appendCatalogGift,
  ensureCatalogMigrated,
  readCatalogRow,
  readManifestIds,
  removeCatalogGift,
  writeCatalogGift,
} from "@/lib/catalog-storage";
import {
  isGiftAvailable,
  normalizeCantidad,
  normalizeGift,
  syncGiftEstado,
} from "@/lib/gift-model";
import {
  clearAllReservations,
  clearGiftReservations,
  readGiftReservations,
  warmReservationStorageMode,
  writeGiftReservations,
} from "@/lib/reservations-store";

type RawGiftRow = Parameters<typeof normalizeGift>[0];

async function loadGift(id: string): Promise<Gift | null> {
  try {
    const row = await readCatalogRow(id);
    if (!row) return null;

    const gift = normalizeGift(row);
    const reservas = await readGiftReservations(id);
    return {
      ...gift,
      reservas,
      estado: syncGiftEstado({ cantidad: gift.cantidad, reservas }),
    };
  } catch (error) {
    console.error(`No se pudo cargar el regalo ${id}:`, error);
    return null;
  }
}

const LOAD_BATCH_SIZE = 24;

async function loadAllGifts(): Promise<Gift[]> {
  await ensureCatalogMigrated();
  await warmReservationStorageMode();

  let ids: string[] = [];
  try {
    ids = await readManifestIds();
  } catch (error) {
    console.error("No se pudo leer el manifiesto de regalos:", error);
    return [];
  }

  if (ids.length === 0) {
    try {
      const { applySeedCatalog } = await import("@/lib/seed-catalog");
      const seeded = await applySeedCatalog();
      console.info(
        `Catálogo vacío: se sembraron ${seeded.giftCount} regalos y ${seeded.categoryCount} categorías.`,
      );
      ids = await readManifestIds();
    } catch (error) {
      console.error("No se pudo sembrar el catálogo vacío:", error);
    }
  }

  const gifts: Gift[] = [];

  for (let index = 0; index < ids.length; index += LOAD_BATCH_SIZE) {
    const batch = ids.slice(index, index + LOAD_BATCH_SIZE);
    const results = await Promise.allSettled(batch.map((id) => loadGift(id)));

    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        gifts.push(result.value);
      }
    }
  }

  return gifts;
}

export async function getAllGiftsLocal(): Promise<Gift[]> {
  return loadAllGifts();
}

export async function getGiftByIdLocal(id: string): Promise<Gift | undefined> {
  const gift = await loadGift(id);
  return gift ?? undefined;
}

export async function createGiftLocal(input: CreateGiftInput): Promise<Gift> {
  const gift: Gift = {
    id: crypto.randomUUID(),
    nombre: input.nombre.trim(),
    emoji: normalizeGiftEmoji(input.emoji),
    especificaciones: input.especificaciones.trim(),
    cantidad: normalizeCantidad(input.cantidad),
    reservas: [],
    estado: "disponible",
    ...(input.categoriaId && { categoriaId: input.categoriaId }),
  };

  await appendCatalogGift(gift);
  return gift;
}

export async function updateGiftLocal(
  id: string,
  input: UpdateGiftInput,
): Promise<Gift | null> {
  const current = await loadGift(id);
  if (!current) return null;

  if (input.cantidad !== undefined) {
    const cantidad = normalizeCantidad(input.cantidad);
    if (cantidad < current.reservas.length) {
      throw new Error(
        `La cantidad no puede ser menor que las reservas actuales (${current.reservas.length})`,
      );
    }
  }

  const updated: Gift = {
    ...current,
    ...(input.nombre !== undefined && { nombre: input.nombre.trim() }),
    ...(input.emoji !== undefined && {
      emoji: normalizeGiftEmoji(input.emoji),
    }),
    ...(input.especificaciones !== undefined && {
      especificaciones: input.especificaciones.trim(),
    }),
    ...(input.cantidad !== undefined && {
      cantidad: normalizeCantidad(input.cantidad),
    }),
  };

  if (input.categoriaId === null) {
    delete updated.categoriaId;
  } else if (input.categoriaId !== undefined) {
    updated.categoriaId = input.categoriaId;
  }

  if (input.clearReservas) {
    updated.reservas = [];
    updated.estado = "disponible";
    await clearGiftReservations(id);
  } else {
    updated.estado = syncGiftEstado(updated);
  }

  await writeCatalogGift(updated);
  return updated;
}

export async function deleteGiftLocal(id: string): Promise<boolean> {
  const current = await loadGift(id);
  if (!current) return false;

  await Promise.all([removeCatalogGift(id), clearGiftReservations(id)]);
  return true;
}

export async function reserveGiftLocal(
  id: string,
  nombre: string,
  requestId?: string,
): Promise<{ gift: Gift } | { error: string }> {
  const trimmedName = nombre.trim();
  if (!trimmedName) return { error: "El nombre es requerido" };

  try {
    const row = await readCatalogRow(id);
    if (!row) return { error: "Regalo no encontrado" };

    const giftMeta = normalizeGift(row);
    const current = await readGiftReservations(id);

    if (requestId) {
      const duplicate = current.find(
        (reserva) => reserva.requestId === requestId,
      );
      if (duplicate) {
        return {
          gift: {
            ...giftMeta,
            reservas: current,
            estado: syncGiftEstado({
              cantidad: giftMeta.cantidad,
              reservas: current,
            }),
          },
        };
      }
    }

    if (!isGiftAvailable({ cantidad: giftMeta.cantidad, reservas: current })) {
      return { error: "Este regalo ya no tiene cupos disponibles" };
    }

    const updatedReservas: GiftReservation[] = [
      ...current,
      {
        nombre: trimmedName,
        reservadoEn: new Date().toISOString(),
        ...(requestId && { requestId }),
      },
    ];

    await writeGiftReservations(id, updatedReservas);

    return {
      gift: {
        ...giftMeta,
        reservas: updatedReservas,
        estado: syncGiftEstado({
          cantidad: giftMeta.cantidad,
          reservas: updatedReservas,
        }),
      },
    };
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Error desconocido";
    return {
      error: `No se pudo guardar la reserva (${detail}).`,
    };
  }
}

export async function resetCatalogFromSeedLocal(
  rows: RawGiftRow[],
): Promise<number> {
  const { writeSeedCatalog } = await import("@/lib/catalog-storage");
  await clearAllReservations();
  return writeSeedCatalog(rows);
}
