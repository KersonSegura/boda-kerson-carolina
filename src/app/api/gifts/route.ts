import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { createGift, getAllGifts } from "@/lib/gifts-store";

export async function GET() {
  const gifts = await getAllGifts();
  return NextResponse.json(gifts);
}

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
    especificaciones: body.especificaciones ?? "",
  });

  return NextResponse.json(gift, { status: 201 });
}
