import type { CreateGiftInput, Gift, UpdateGiftInput } from "@/types/gift";
import { readJsonWithSeed, writeJson, isUsingBlobStorage } from "@/lib/json-storage";

const FILENAME = "gifts.json";

async function readGiftsFile(): Promise<Gift[]> {
  return readJsonWithSeed<Gift[]>(FILENAME);
}

async function writeGiftsFile(gifts: Gift[]): Promise<void> {
  await writeJson(FILENAME, gifts);
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
    especificaciones: input.especificaciones.trim(),
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

  const current = gifts[index];
  const updated: Gift = {
    ...current,
    ...(input.nombre !== undefined && { nombre: input.nombre.trim() }),
    ...(input.especificaciones !== undefined && {
      especificaciones: input.especificaciones.trim(),
    }),
    ...(input.estado !== undefined && { estado: input.estado }),
  };

  if (input.categoriaId === null) {
    delete updated.categoriaId;
  } else if (input.categoriaId !== undefined) {
    updated.categoriaId = input.categoriaId;
  }

  if (input.reservadoPor === null) {
    delete updated.reservadoPor;
    delete updated.reservadoEn;
  } else if (input.reservadoPor !== undefined) {
    updated.reservadoPor = input.reservadoPor.trim();
    updated.reservadoEn = new Date().toISOString();
  }

  if (input.estado === "disponible") {
    delete updated.reservadoPor;
    delete updated.reservadoEn;
  }

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

    const current = gifts[index];
    if (current.estado === "reservado") {
      return { error: "Este regalo ya fue reservado" };
    }

    const trimmedName = nombre.trim();
    if (!trimmedName) return { error: "El nombre es requerido" };

    const updated: Gift = {
      ...current,
      estado: "reservado",
      reservadoPor: trimmedName,
      reservadoEn: new Date().toISOString(),
    };

    gifts[index] = updated;
    await writeGiftsFile(gifts);
    return { gift: updated };
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
