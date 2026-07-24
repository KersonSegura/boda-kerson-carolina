import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { ensureSchema } from "@/lib/db";
import { applySeedCatalog } from "@/lib/seed-catalog";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  await ensureSchema();
  const result = await applySeedCatalog();
  return NextResponse.json(result);
}
