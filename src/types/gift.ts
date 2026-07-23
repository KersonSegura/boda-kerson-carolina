export type GiftStatus = "disponible" | "reservado";

export interface Gift {
  id: string;
  nombre: string;
  especificaciones: string;
  estado: GiftStatus;
  reservadoPor?: string;
  reservadoEn?: string;
}

export interface CreateGiftInput {
  nombre: string;
  especificaciones: string;
}

export interface UpdateGiftInput {
  nombre?: string;
  especificaciones?: string;
  estado?: GiftStatus;
  reservadoPor?: string | null;
}
