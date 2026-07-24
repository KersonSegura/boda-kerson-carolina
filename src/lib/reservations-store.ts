import type { GiftReservation } from "@/types/gift";
import { deleteJson, listPathnames, readJson, writeJson } from "@/lib/json-storage";

const LEGACY_MAP_PATH = "reservations.json";

let migrationPromise: Promise<void> | null = null;
let usingPerGiftFiles = false;

export function giftReservationsPath(id: string): string {
  return `reservations/${id}.json`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

export async function ensureReservationsMigrated(): Promise<void> {
  if (!migrationPromise) {
    migrationPromise = migrateLegacyReservationsIfNeeded();
  }
  await migrationPromise;
}

async function migrateLegacyReservationsIfNeeded(): Promise<void> {
  const perGiftFiles = await listPathnames("reservations/");
  if (perGiftFiles.length > 0) {
    usingPerGiftFiles = true;
    return;
  }

  const map = await readLegacyMap();
  if (Object.keys(map).length === 0) {
    usingPerGiftFiles = true;
    return;
  }

  await Promise.all(
    Object.entries(map).map(([giftId, reservas]) =>
      writeGiftReservations(giftId, reservas),
    ),
  );
  usingPerGiftFiles = true;
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

  // Tras migración, archivo ausente = sin reservas (no volver al mapa legacy).
  if (usingPerGiftFiles) return [];

  const legacy = await readLegacyMap();
  return legacy[id] ?? [];
}

export async function readGiftReservationsWithRetry(
  id: string,
  expectedCount: number,
  maxAttempts = 6,
): Promise<GiftReservation[]> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const fromFile = await readGiftReservationsFromFile(id);
    if (fromFile && fromFile.length >= expectedCount) return fromFile;
    await sleep(120 * (attempt + 1));
  }

  return (await readGiftReservationsFromFile(id)) ?? [];
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
  usingPerGiftFiles = true;
}
