import type { GiftReservation } from "@/types/gift";
import { deleteJson, listPathnames, readJson, writeJson } from "@/lib/json-storage";

const LEGACY_MAP_PATH = "reservations.json";

let migrationPromise: Promise<void> | null = null;

export function giftReservationsPath(id: string): string {
  return `reservations/${id}.json`;
}

function normalizeReservations(raw: unknown): GiftReservation[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row) => row && typeof row === "object" && "nombre" in row)
    .map((row) => {
      const entry = row as GiftReservation;
      return {
        nombre: String(entry.nombre ?? "").trim(),
        reservadoEn: entry.reservadoEn ?? new Date().toISOString(),
        ...(entry.requestId && { requestId: String(entry.requestId) }),
      };
    })
    .filter((row) => row.nombre);
}

function normalizeLegacyMap(raw: unknown): Record<string, GiftReservation[]> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  const map: Record<string, GiftReservation[]> = {};
  for (const [giftId, entry] of Object.entries(raw as Record<string, unknown>)) {
    const reservas = normalizeReservations(entry);
    if (reservas.length > 0) map[giftId] = reservas;
  }
  return map;
}

async function readLegacyMap(): Promise<Record<string, GiftReservation[]>> {
  try {
    const legacy = await readJson<unknown>(LEGACY_MAP_PATH);
    return normalizeLegacyMap(legacy);
  } catch {
    return {};
  }
}

function parseReservationFile(
  raw: { reservas?: GiftReservation[] } | GiftReservation[] | null,
): GiftReservation[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return normalizeReservations(raw);
  return normalizeReservations(raw.reservas);
}

async function hasPerGiftReservationFiles(): Promise<boolean> {
  const files = await listPathnames("reservations/");
  return files.length > 0;
}

export async function ensureReservationsMigrated(): Promise<void> {
  if (!migrationPromise) {
    migrationPromise = migrateLegacyReservationsIfNeeded();
  }
  await migrationPromise;
}

async function migrateLegacyReservationsIfNeeded(): Promise<void> {
  if (await hasPerGiftReservationFiles()) return;

  const map = await readLegacyMap();
  if (Object.keys(map).length === 0) return;

  await Promise.all(
    Object.entries(map).map(([giftId, reservas]) =>
      writeGiftReservations(giftId, reservas),
    ),
  );
}

async function readGiftReservationsFromFile(
  id: string,
): Promise<GiftReservation[] | null> {
  try {
    const raw = await readJson<
      { reservas?: GiftReservation[] } | GiftReservation[]
    >(giftReservationsPath(id));
    if (raw === null) return null;
    return parseReservationFile(raw);
  } catch {
    return null;
  }
}

export async function readGiftReservations(id: string): Promise<GiftReservation[]> {
  await ensureReservationsMigrated();

  const fromFile = await readGiftReservationsFromFile(id);
  if (fromFile !== null) return fromFile;

  // Si ya hay archivos por regalo en Blob, ausencia = sin reservas.
  if (await hasPerGiftReservationFiles()) return [];

  const legacy = await readLegacyMap();
  return legacy[id] ?? [];
}

export async function writeGiftReservations(
  id: string,
  reservas: GiftReservation[],
): Promise<void> {
  await writeJson(giftReservationsPath(id), { reservas });
}

export async function clearGiftReservations(giftId: string): Promise<void> {
  await writeGiftReservations(giftId, []);
}

/** Migra reservas embebidas en filas del catálogo legacy. */
export async function migrateEmbeddedReservations(
  embedded: Record<string, GiftReservation[]>,
): Promise<void> {
  await ensureReservationsMigrated();

  await Promise.all(
    Object.entries(embedded).map(async ([giftId, reservas]) => {
      if (reservas.length === 0) return;
      const existing = await readGiftReservations(giftId);
      if (existing.length === 0) {
        await writeGiftReservations(giftId, reservas);
      }
    }),
  );
}

export async function clearAllReservations(): Promise<void> {
  const files = await listPathnames("reservations/");
  await Promise.all(files.map((pathname) => deleteJson(pathname)));
  migrationPromise = null;
}
