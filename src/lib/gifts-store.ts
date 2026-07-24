import type { CreateGiftInput, Gift, UpdateGiftInput } from "@/types/gift";
import { DEFAULT_GIFT_EMOJI, normalizeGiftEmoji } from "@/lib/gift-emoji";
import {
  giftForStorage,
  isGiftAvailable,
  normalizeCantidad,
  normalizeGift,
  normalizeGifts,
  syncGiftEstado,
} from "@/lib/gift-model";
import { ensureCatalogSynced } from "@/lib/seed-catalog";
import { readJsonWithSeed, writeJson, isUsingBlobStorage } from "@/lib/json-storage";

const FILENAME = "gifts.json";

async function readGiftsFile(): Promise<Gift[]> {
  await ensureCatalogSynced();
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
  return updated;
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
  try {
    const gifts = await readGiftsFile();
    const index = gifts.findIndex((gift) => gift.id === id);
    if (index === -1) return { error: "Regalo no encontrado" };

    const current = normalizeGift(gifts[index]);
    if (!isGiftAvailable(current)) {
      return { error: "Este regalo ya no tiene cupos disponibles" };
    }

    const trimmedName = nombre.trim();
    if (!trimmedName) return { error: "El nombre es requerido" };

    const updated: Gift = {
      ...current,
      reservas: [
        ...current.reservas,
        {
          nombre: trimmedName,
          reservadoEn: new Date().toISOString(),
        },
      ],
    };
    updated.estado = syncGiftEstado(updated);

    gifts[index] = updated;
    await writeGiftsFile(gifts);

    const saved = await getGiftById(id);
    if (!saved) return { error: "Regalo no encontrado" };

    return { gift: saved };
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
