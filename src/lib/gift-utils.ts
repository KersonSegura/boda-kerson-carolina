import type { Gift, PublicGift } from "@/types/gift";
import { resolveGiftEmoji } from "@/lib/gift-emoji";

export function toPublicGift(gift: Gift): PublicGift {
  return {
    id: gift.id,
    nombre: gift.nombre,
    emoji: resolveGiftEmoji(gift),
    especificaciones: gift.especificaciones,
    estado: gift.estado,
    categoriaId: gift.categoriaId,
  };
}

export function toPublicGifts(gifts: Gift[]): PublicGift[] {
  return gifts.map(toPublicGift);
}
