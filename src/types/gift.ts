export type GiftStatus = "disponible" | "reservado";

export interface Gift {
  id: string;
  nombre: string;
  emoji?: string;
  especificaciones: string;
  estado: GiftStatus;
  categoriaId?: string;
  reservadoPor?: string;
  reservadoEn?: string;
}

/** Datos visibles en la página pública (sin info de quién reservó) */
export interface PublicGift {
  id: string;
  nombre: string;
  emoji: string;
  especificaciones: string;
  estado: GiftStatus;
  categoriaId?: string;
}

export interface CreateGiftInput {
  nombre: string;
  emoji: string;
  especificaciones: string;
  categoriaId?: string;
}

export interface UpdateGiftInput {
  nombre?: string;
  emoji?: string;
  especificaciones?: string;
  categoriaId?: string | null;
  estado?: GiftStatus;
  reservadoPor?: string | null;
}
