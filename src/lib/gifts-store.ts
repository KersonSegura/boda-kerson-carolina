import type { CreateGiftInput, Gift, UpdateGiftInput } from "@/types/gift";
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

const FILENAME = "gifts.json";
const MAX_WRITE_RETRIES = 5;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readGiftsFile(): Promise<Gift[]> {
  const raw = await readJsonWithSeed<Gift[]>(FILENAME);
  return normalizeGifts(raw as Gift[]);
}

async function writeGiftsFile(gifts: Gift[]): Promise<void> {
  await writeJson(FILENAME, gifts.map(giftForStorage));
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
  await writeGiftsFile(gifts);
  return gift;
}

export async function updateGift(
  id: string,
  input: UpdateGiftInput,
): Promise<Gift | null> {
  for (let attempt = 0; attempt < MAX_WRITE_RETRIES; attempt++) {
    const gifts = await readGiftsFile();
    const index = gifts.findIndex((gift) => gift.id === id);
    if (index === -1) return null;

    const current = normalizeGift(gifts[index]);

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
    }

    updated.estado = syncGiftEstado(updated);

    gifts[index] = updated;
    await writeGiftsFile(gifts);

    const verified = await getGiftById(id);
    if (verified && giftsMatchForUpdate(verified, updated, input)) {
      return verified;
    }

    await sleep(60 * (attempt + 1));
  }

  throw new Error("No se pudo guardar el regalo. Intenta de nuevo.");
}

function giftsMatchForUpdate(
  verified: Gift,
  expected: Gift,
  input: UpdateGiftInput,
): boolean {
  if (input.clearReservas && verified.reservas.length !== 0) return false;
  if (input.emoji !== undefined && verified.emoji !== expected.emoji) return false;
  if (input.nombre !== undefined && verified.nombre !== expected.nombre) return false;
  if (input.cantidad !== undefined && verified.cantidad !== expected.cantidad) {
    return false;
  }
  if (
    input.especificaciones !== undefined &&
    verified.especificaciones !== expected.especificaciones
  ) {
    return false;
  }
  return true;
}

export async function deleteGift(id: string): Promise<boolean> {
  const gifts = await readGiftsFile();
  const filtered = gifts.filter((gift) => gift.id !== id);
  if (filtered.length === gifts.length) return false;
  await writeGiftsFile(filtered);
  return true;
}

export async function reserveGift(
  id: string,
  nombre: string,
): Promise<{ gift: Gift } | { error: string }> {
  const trimmedName = nombre.trim();
  if (!trimmedName) return { error: "El nombre es requerido" };

  try {
    for (let attempt = 0; attempt < MAX_WRITE_RETRIES; attempt++) {
      const gifts = await readGiftsFile();
      const index = gifts.findIndex((gift) => gift.id === id);
      if (index === -1) return { error: "Regalo no encontrado" };

      const current = normalizeGift(gifts[index]);
      if (!isGiftAvailable(current)) {
        return { error: "Este regalo ya no tiene cupos disponibles" };
      }

      const reservadoEn = new Date().toISOString();
      const updated: Gift = {
        ...current,
        reservas: [
          ...current.reservas,
          {
            nombre: trimmedName,
            reservadoEn,
          },
        ],
      };
      updated.estado = syncGiftEstado(updated);

      gifts[index] = updated;
      await writeGiftsFile(gifts);

      const verified = await getGiftById(id);
      const reservationSaved = verified?.reservas.some(
        (reserva) =>
          reserva.nombre === trimmedName && reserva.reservadoEn === reservadoEn,
      );

      if (verified && reservationSaved) {
        return { gift: verified };
      }

      await sleep(80 * (attempt + 1));
    }

    return {
      error: "No se pudo confirmar la reserva. Recarga la página e intenta de nuevo.",
    };
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Error desconocido";
    return {
      error: isUsingBlobStorage()
        ? `No se pudo guardar la reserva (${detail}). Verifica que el Blob esté conectado al proyecto en Vercel → Storage.`
        : "No se pudo guardar la reserva en el servidor.",
    };
  }
}
