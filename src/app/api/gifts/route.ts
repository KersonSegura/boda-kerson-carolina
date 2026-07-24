import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { toPublicGifts } from "@/lib/gift-utils";
import { createGift, getAllGifts } from "@/lib/gifts-store";

export const dynamic = "force-dynamic";

/** Lista pública — sin datos de quién reservó */
export async function GET() {
  const gifts = await getAllGifts();
  return NextResponse.json(toPublicGifts(gifts));
}

/** Crear regalo (solo admin) */
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.nombre?.trim()) {
    return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
  }

  const gift = await createGift({
    nombre: body.nombre,
    emoji: body.emoji ?? "",
    especificaciones: body.especificaciones ?? "",
    cantidad: body.cantidad,
    categoriaId: body.categoriaId,
  });

  return NextResponse.json(gift, { status: 201 });
}
