import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { toPublicGift } from "@/lib/gift-utils";
import { deleteGift, getGiftById, updateGift } from "@/lib/gifts-store";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const gift = await updateGift(id, {
      nombre: body.nombre,
      emoji: body.emoji,
      especificaciones: body.especificaciones,
      cantidad: body.cantidad,
      categoriaId: body.categoriaId,
      clearReservas: body.clearReservas === true,
    });

    if (!gift) {
      return NextResponse.json({ error: "Regalo no encontrado" }, { status: 404 });
    }

    return NextResponse.json(gift);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo actualizar el regalo";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await deleteGift(id);

  if (!deleted) {
    return NextResponse.json({ error: "Regalo no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const gift = await getGiftById(id);

  if (!gift) {
    return NextResponse.json({ error: "Regalo no encontrado" }, { status: 404 });
  }

  return NextResponse.json(toPublicGift(gift));
}
