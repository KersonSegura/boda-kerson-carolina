import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { storageErrorResponse } from "@/lib/api-error";
import { getAllGifts } from "@/lib/gifts-store";

export const dynamic = "force-dynamic";

/** Lista completa con reservas — solo admin */
export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const gifts = await getAllGifts();
    return NextResponse.json(gifts, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    const { message, status } = storageErrorResponse(
      error,
      "No se pudieron cargar los regalos",
    );
    return NextResponse.json({ error: message }, { status });
  }
}
