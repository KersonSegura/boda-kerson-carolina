import type { Gift, PublicGift } from "@/types/gift";

export function toPublicGift(gift: Gift): PublicGift {
  return {
    id: gift.id,
    nombre: gift.nombre,
    especificaciones: gift.especificaciones,
    estado: gift.estado,
    categoriaId: gift.categoriaId,
  };
}

export function toPublicGifts(gifts: Gift[]): PublicGift[] {
  return gifts.map(toPublicGift);
}
