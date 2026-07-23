import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "admin_session";

export function getAdminPassword(): string {
  return (process.env.ADMIN_PASSWORD ?? "boda2026").trim();
}

/** Valor de cookie firmado con la contraseña — no se puede adivinar. */
export function createAdminSessionValue(): string {
  return createHmac("sha256", getAdminPassword())
    .update("boda-admin-session-v1")
    .digest("hex");
}

function isValidSessionValue(value: string): boolean {
  const expected = createAdminSessionValue();
  try {
    return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const value = cookieStore.get(ADMIN_COOKIE)?.value;
  return Boolean(value && isValidSessionValue(value));
}

export function verifyAdminPassword(password: string): boolean {
  const input = password.trim();
  if (!input) return false;
  return input === getAdminPassword();
}
