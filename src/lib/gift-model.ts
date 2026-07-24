import type { Gift, GiftReservation, GiftStatus } from "@/types/gift";

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
  if (Array.isArray(raw.reservas) && raw.reservas.length > 0) {
    return raw.reservas
      .filter((r) => r?.nombre?.trim())
      .map((r) => ({
        nombre: r.nombre.trim(),
        reservadoEn: r.reservadoEn ?? new Date().toISOString(),
      }));
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
