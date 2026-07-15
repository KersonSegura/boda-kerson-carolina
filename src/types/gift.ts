export type GiftStatus = "disponible" | "reservado";

export interface Gift {
  id: number;
  nombre: string;
  especificaciones: string;
  estado: GiftStatus;
}
