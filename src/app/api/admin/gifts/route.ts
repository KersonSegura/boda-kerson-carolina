import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getAllGifts } from "@/lib/gifts-store";

export const dynamic = "force-dynamic";

/** Lista completa con reservas — solo admin */
export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const gifts = await getAllGifts();
  return NextResponse.json(gifts);
}
