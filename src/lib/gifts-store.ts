import { promises as fs } from "fs";
import path from "path";
import type { CreateGiftInput, Gift, UpdateGiftInput } from "@/types/gift";

const DATA_PATH = path.join(process.cwd(), "data", "gifts.json");

async function readGiftsFile(): Promise<Gift[]> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    return JSON.parse(raw) as Gift[];
  } catch {
    return [];
  }
}

async function writeGiftsFile(gifts: Gift[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(gifts, null, 2), "utf-8");
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
}
