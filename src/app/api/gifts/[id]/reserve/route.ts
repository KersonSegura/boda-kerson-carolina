import { NextResponse } from "next/server";
import { toPublicGift } from "@/lib/gift-utils";
import { reserveGift } from "@/lib/gifts-store";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;

  let body: { nombre?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const result = await reserveGift(id, body.nombre ?? "");

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(toPublicGift(result.gift));
}
