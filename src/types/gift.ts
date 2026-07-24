export type GiftStatus = "disponible" | "reservado";

export interface GiftReservation {
  nombre: string;
  reservadoEn: string;
}

export interface Gift {
  id: string;
  nombre: string;
  emoji?: string;
  especificaciones: string;
  cantidad: number;
  reservas: GiftReservation[];
  estado: GiftStatus;
  categoriaId?: string;
}

/** Datos visibles en la página pública (sin nombres de quien reservó) */
export interface PublicGift {
  id: string;
  nombre: string;
  emoji: string;
  especificaciones: string;
  cantidad: number;
  reservados: number;
  estado: GiftStatus;
  categoriaId?: string;
}

export interface CreateGiftInput {
  nombre: string;
  emoji: string;
  especificaciones: string;
  cantidad?: number;
  categoriaId?: string;
}

export interface UpdateGiftInput {
  nombre?: string;
  emoji?: string;
  especificaciones?: string;
  cantidad?: number;
  categoriaId?: string | null;
  clearReservas?: boolean;
}
