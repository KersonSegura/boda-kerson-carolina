import { cookies } from "next/headers";

export const ADMIN_COOKIE = "admin_session";

export function getAdminPassword(): string {
  return (process.env.ADMIN_PASSWORD ?? "boda2026").trim();
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE)?.value === "authenticated";
}

export function verifyAdminPassword(password: string): boolean {
  const input = password.trim();
  if (!input) return false;
  return input === getAdminPassword();
}
