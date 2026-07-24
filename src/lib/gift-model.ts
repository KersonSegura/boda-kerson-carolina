import type { Gift, GiftReservation, GiftStatus } from "@/types/gift";
import { normalizeGiftEmoji } from "@/lib/gift-emoji";

type RawGift = Partial<Gift> & {
  id: string;
  nombre: string;
  reservadoPor?: string;
  reservadoEn?: string;
};

export function normalizeCantidad(value: unknown): number {
  const parsed =
    typeof value === "number" ? value : parseInt(String(value ?? 1), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(parsed, 99);
}

function migrateReservas(raw: RawGift): GiftReservation[] {
  if (Array.isArray(raw.reservas)) {
    const fromArray = raw.reservas
      .filter((r) => r?.nombre?.trim())
      .map((r) => ({
        nombre: r.nombre.trim(),
        reservadoEn: r.reservadoEn ?? new Date().toISOString(),
      }));

    if (fromArray.length === 0 && raw.reservadoPor?.trim()) {
      return [
        {
          nombre: raw.reservadoPor.trim(),
          reservadoEn: raw.reservadoEn ?? new Date().toISOString(),
        },
      ];
    }

    return fromArray;
  }

  if (raw.reservadoPor?.trim()) {
    return [
      {
        nombre: raw.reservadoPor.trim(),
        reservadoEn: raw.reservadoEn ?? new Date().toISOString(),
      },
    ];
  }

  return [];
}

/** Catálogo en gifts.json — las reservas viven en reservations.json */
export function giftForStorage(gift: Gift) {
  const stored: {
    id: string;
    nombre: string;
    emoji: string;
    especificaciones: string;
    cantidad: number;
    categoriaId?: string;
  } = {
    id: gift.id,
    nombre: gift.nombre,
    especificaciones: gift.especificaciones,
    cantidad: gift.cantidad,
    emoji: normalizeGiftEmoji(gift.emoji ?? ""),
  };

  if (gift.categoriaId) {
    stored.categoriaId = gift.categoriaId;
  }

  return stored;
}

export function syncGiftEstado(gift: Pick<Gift, "cantidad" | "reservas">): GiftStatus {
  return gift.reservas.length >= gift.cantidad ? "reservado" : "disponible";
}

export function normalizeGift(raw: RawGift): Gift {
  const cantidad = normalizeCantidad(raw.cantidad);
  const reservas = migrateReservas(raw);

  return {
    id: raw.id,
    nombre: raw.nombre,
    emoji: raw.emoji,
    especificaciones: raw.especificaciones ?? "",
    cantidad,
    reservas,
    estado: syncGiftEstado({ cantidad, reservas }),
    ...(raw.categoriaId && { categoriaId: raw.categoriaId }),
  };
}

export function normalizeGifts(rawGifts: RawGift[]): Gift[] {
  return rawGifts.map(normalizeGift);
}

export function isGiftAvailable(gift: Pick<Gift, "cantidad" | "reservas">): boolean {
  return gift.reservas.length < gift.cantidad;
}

export function getReservadosCount(gift: Pick<Gift, "reservas">): number {
  return gift.reservas.length;
}
