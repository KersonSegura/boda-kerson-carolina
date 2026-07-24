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
import { isUsingBlobStorage } from "@/lib/json-storage";
import {
  clearAllReservations,
  clearGiftReservations,
  readGiftReservations,
  readGiftReservationsWithRetry,
  writeGiftReservations,
} from "@/lib/reservations-store";

type RawGiftRow = Parameters<typeof normalizeGift>[0];

async function loadGift(id: string): Promise<Gift | null> {
  const row = await readCatalogRow(id);
  if (!row) return null;

  const gift = normalizeGift(row);
  const reservas = await readGiftReservations(id);
  return {
    ...gift,
    reservas,
    estado: syncGiftEstado({ cantidad: gift.cantidad, reservas }),
  };
}

async function loadAllGifts(): Promise<Gift[]> {
  await ensureCatalogMigrated();

  const ids = await readManifestIds();
  const gifts = await Promise.all(ids.map((id) => loadGift(id)));
  return gifts.filter((gift): gift is Gift => gift !== null);
}

export async function getAllGifts(): Promise<Gift[]> {
  return loadAllGifts();
}

export async function getGiftById(id: string): Promise<Gift | undefined> {
  const gift = await loadGift(id);
  return gift ?? undefined;
}

export async function createGift(input: CreateGiftInput): Promise<Gift> {
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

export async function updateGift(
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

export async function deleteGift(id: string): Promise<boolean> {
  const current = await loadGift(id);
  if (!current) return false;

  await Promise.all([removeCatalogGift(id), clearGiftReservations(id)]);
  return true;
}

export async function reserveGift(
  id: string,
  nombre: string,
): Promise<{ gift: Gift } | { error: string }> {
  const trimmedName = nombre.trim();
  if (!trimmedName) return { error: "El nombre es requerido" };

  try {
    const row = await readCatalogRow(id);
    if (!row) return { error: "Regalo no encontrado" };

    const giftMeta = normalizeGift(row);
    const current = await readGiftReservations(id);

    if (!isGiftAvailable({ cantidad: giftMeta.cantidad, reservas: current })) {
      return { error: "Este regalo ya no tiene cupos disponibles" };
    }

    const reservadoEn = new Date().toISOString();
    const updatedReservas: GiftReservation[] = [
      ...current,
      { nombre: trimmedName, reservadoEn },
    ];

    await writeGiftReservations(id, updatedReservas);

    const saved = await readGiftReservationsWithRetry(
      id,
      updatedReservas.length,
    );

    const savedCount = saved.length;
    if (savedCount < updatedReservas.length) {
      return {
        error:
          "No se pudo confirmar la reserva en el servidor. Intenta de nuevo.",
      };
    }

    const gift: Gift = {
      ...giftMeta,
      reservas: saved,
      estado: syncGiftEstado({
        cantidad: giftMeta.cantidad,
        reservas: saved,
      }),
    };

    return { gift };
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Error desconocido";
    return {
      error: isUsingBlobStorage()
        ? `No se pudo guardar la reserva (${detail}).`
        : "No se pudo guardar la reserva en el servidor.",
    };
  }
}

export async function resetCatalogFromSeed(rows: RawGiftRow[]): Promise<number> {
  const { writeSeedCatalog } = await import("@/lib/catalog-storage");
  await clearAllReservations();
  return writeSeedCatalog(rows);
}
