import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  getAdminPassword,
  verifyAdminPassword,
} from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json();

  if (!verifyAdminPassword(body.password ?? "")) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_COOKIE, "authenticated", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(ADMIN_COOKIE);
  return response;
}

export async function GET() {
  return NextResponse.json({ configured: !!getAdminPassword() });
}
