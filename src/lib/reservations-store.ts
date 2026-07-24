import type { GiftReservation } from "@/types/gift";
import { readJson, readJsonWithSeed, writeJson } from "@/lib/json-storage";

const FILENAME = "reservations.json";

export type ReservationsMap = Record<string, GiftReservation[]>;

function normalizeReservationsMap(raw: unknown): ReservationsMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  const map: ReservationsMap = {};
  for (const [giftId, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(entry)) continue;
    const reservas = entry
      .filter((r) => r && typeof r === "object" && "nombre" in r)
      .map((r) => {
        const row = r as GiftReservation;
        return {
          nombre: String(row.nombre ?? "").trim(),
          reservadoEn: row.reservadoEn ?? new Date().toISOString(),
        };
      })
      .filter((r) => r.nombre);
    if (reservas.length > 0) map[giftId] = reservas;
  }
  return map;
}

export async function readReservationsMap(): Promise<ReservationsMap> {
  const raw = await readJsonWithSeed<unknown>(FILENAME);
  return normalizeReservationsMap(raw);
}

export async function writeReservationsMap(map: ReservationsMap): Promise<void> {
  await writeJson(FILENAME, map);
}

export async function clearGiftReservations(giftId: string): Promise<void> {
  const map = await readReservationsMap();
  delete map[giftId];
  await writeReservationsMap(map);
}

/** Migra reservas embebidas en gifts.json al archivo dedicado (una sola vez). */
export async function migrateEmbeddedReservations(
  embedded: ReservationsMap,
): Promise<ReservationsMap> {
  const existing = await readJson<unknown>(FILENAME);
  const map = normalizeReservationsMap(existing);

  let changed = false;
  for (const [giftId, reservas] of Object.entries(embedded)) {
    if (reservas.length === 0) continue;
    if (!map[giftId]?.length) {
      map[giftId] = reservas;
      changed = true;
    }
  }

  if (changed) {
    await writeReservationsMap(map);
  }

  return map;
}
