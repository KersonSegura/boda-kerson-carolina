import type { Gift, PublicGift } from "@/types/gift";
import { resolveGiftEmoji } from "@/lib/gift-emoji";
import { normalizeGift } from "@/lib/gift-model";

export function toPublicGift(gift: Gift): PublicGift {
  const normalized = normalizeGift(gift);

  return {
    id: normalized.id,
    nombre: normalized.nombre,
    emoji: resolveGiftEmoji(normalized),
    especificaciones: normalized.especificaciones,
    cantidad: normalized.cantidad,
    reservados: normalized.reservas.length,
    estado: normalized.estado,
    categoriaId: normalized.categoriaId,
  };
}

export function toPublicGifts(gifts: Gift[]): PublicGift[] {
  return gifts.map(toPublicGift);
}

/** Incrementa reservados al instante, antes de que responda el servidor. */
export function applyOptimisticReservation(gift: PublicGift): PublicGift {
  const reservados = Math.min(gift.reservados + 1, gift.cantidad);
  return {
    ...gift,
    reservados,
    estado: reservados >= gift.cantidad ? "reservado" : "disponible",
  };
}

/** Evita que un fetch con datos viejos del Blob pise una reserva reciente. */
export function mergePublicGifts(
  local: PublicGift[],
  server: PublicGift[],
): PublicGift[] {
  const serverById = new Map(server.map((gift) => [gift.id, gift]));

  const merged = local.map((localGift) => {
    const serverGift = serverById.get(localGift.id);
    if (!serverGift) return localGift;
    serverById.delete(localGift.id);

    if (localGift.reservados > serverGift.reservados) return localGift;
    if (localGift.reservados < serverGift.reservados) return serverGift;

    return localGift.estado === serverGift.estado ? localGift : serverGift;
  });

  for (const serverGift of serverById.values()) {
    merged.push(serverGift);
  }

  return merged;
}

export { normalizeGift, normalizeGifts, isGiftAvailable } from "@/lib/gift-model";
