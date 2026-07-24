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

export { normalizeGift, normalizeGifts, isGiftAvailable } from "@/lib/gift-model";
