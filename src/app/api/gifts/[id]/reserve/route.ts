import { NextResponse } from "next/server";
import { reserveGift } from "@/lib/gifts-store";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.json();

  const result = await reserveGift(id, body.nombre ?? "");

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.gift);
}
