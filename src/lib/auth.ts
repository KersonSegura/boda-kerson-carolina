import { cookies } from "next/headers";

export const ADMIN_COOKIE = "admin_session";

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "boda2026";
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE)?.value === "authenticated";
}

export function verifyAdminPassword(password: string): boolean {
  return password === getAdminPassword();
}
