import { NextResponse } from "next/server";
import { storageErrorResponse } from "@/lib/api-error";
import { getAllCategories } from "@/lib/categories-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categories = await getAllCategories();
    return NextResponse.json(categories, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    const { message, status } = storageErrorResponse(
      error,
      "No se pudieron cargar las categorías",
    );
    return NextResponse.json({ error: message }, { status });
  }
}
