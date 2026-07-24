import type { CreateGiftInput, Gift, GiftReservation, UpdateGiftInput } from "@/types/gift";
import { normalizeGiftEmoji } from "@/lib/gift-emoji";
import {
  giftForStorage,
  isGiftAvailable,
  normalizeCantidad,
  normalizeGift,
  normalizeGifts,
  syncGiftEstado,
} from "@/lib/gift-model";
import { readJsonWithSeed, writeJson, isUsingBlobStorage } from "@/lib/json-storage";
import {
  clearGiftReservations,
  migrateEmbeddedReservations,
  readReservationsMap,
  writeReservationsMap,
} from "@/lib/reservations-store";

const FILENAME = "gifts.json";

type RawGiftRow = Parameters<typeof normalizeGift>[0];

async function readCatalogFile(): Promise<RawGiftRow[]> {
  const raw = await readJsonWithSeed<RawGiftRow[]>(FILENAME);
  return raw as RawGiftRow[];
}

async function writeCatalogFile(gifts: Gift[]): Promise<void> {
  await writeJson(FILENAME, gifts.map(giftForStorage));
}

function attachReservations(
  catalog: RawGiftRow[],
  reservations: Record<string, GiftReservation[]>,
): Gift[] {
  return catalog.map((row) => {
    const gift = normalizeGift(row);
    const fromStore = reservations[gift.id];
    const reservas =
      fromStore && fromStore.length > 0 ? fromStore : gift.reservas;
    return {
      ...gift,
      reservas,
      estado: syncGiftEstado({ cantidad: gift.cantidad, reservas }),
    };
  });
}

async function readGiftsFile(): Promise<Gift[]> {
  const catalog = await readCatalogFile();
  const normalized = normalizeGifts(catalog);

  const embedded: Record<string, GiftReservation[]> = {};
  for (const gift of normalized) {
    if (gift.reservas.length > 0) {
      embedded[gift.id] = gift.reservas;
    }
  }

  const reservations = await migrateEmbeddedReservations(embedded);
  return attachReservations(catalog, reservations);
}

export async function getAllGifts(): Promise<Gift[]> {
  return readGiftsFile();
}

export async function getGiftById(id: string): Promise<Gift | undefined> {
  const gifts = await readGiftsFile();
  return gifts.find((gift) => gift.id === id);
}

export async function createGift(input: CreateGiftInput): Promise<Gift> {
  const gifts = await readGiftsFile();
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
  gifts.push(gift);
  await writeCatalogFile(gifts);
  return gift;
}

export async function updateGift(
  id: string,
  input: UpdateGiftInput,
): Promise<Gift | null> {
  const gifts = await readGiftsFile();
  const index = gifts.findIndex((gift) => gift.id === id);
  if (index === -1) return null;

  const current = gifts[index];

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

  gifts[index] = updated;
  await writeCatalogFile(gifts);
  return updated;
}

export async function deleteGift(id: string): Promise<boolean> {
  const gifts = await readGiftsFile();
  const filtered = gifts.filter((gift) => gift.id !== id);
  if (filtered.length === gifts.length) return false;
  await Promise.all([writeCatalogFile(filtered), clearGiftReservations(id)]);
  return true;
}

export async function reserveGift(
  id: string,
  nombre: string,
): Promise<{ gift: Gift } | { error: string }> {
  const trimmedName = nombre.trim();
  if (!trimmedName) return { error: "El nombre es requerido" };

  try {
    const catalog = await readCatalogFile();
    const row = catalog.find((gift) => gift.id === id);
    if (!row) return { error: "Regalo no encontrado" };

    const giftMeta = normalizeGift(row);
    const reservations = await readReservationsMap();
    const current = reservations[id] ?? [];

    if (!isGiftAvailable({ cantidad: giftMeta.cantidad, reservas: current })) {
      return { error: "Este regalo ya no tiene cupos disponibles" };
    }

    const reservadoEn = new Date().toISOString();
    const updatedReservas: GiftReservation[] = [
      ...current,
      { nombre: trimmedName, reservadoEn },
    ];

    reservations[id] = updatedReservas;
    await writeReservationsMap(reservations);

    const verified = await readReservationsMap();
    const saved = verified[id] ?? [];
    const reservationSaved = saved.some(
      (reserva) =>
        reserva.nombre === trimmedName && reserva.reservadoEn === reservadoEn,
    );

    if (!reservationSaved) {
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
