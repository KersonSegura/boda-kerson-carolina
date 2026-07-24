import type { Gift } from "@/types/gift";
import { giftForStorage, normalizeGift } from "@/lib/gift-model";
import { deleteJson, listPathnames, readJson, writeJson } from "@/lib/json-storage";
import { migrateEmbeddedReservations } from "@/lib/reservations-store";

const MANIFEST_PATH = "gifts/manifest.json";
const LEGACY_CATALOG_PATH = "gifts.json";

type CatalogManifest = { ids: string[] };
type RawGiftRow = Parameters<typeof normalizeGift>[0];

let migrationPromise: Promise<void> | null = null;

export function giftCatalogPath(id: string): string {
  return `gifts/${id}.json`;
}

export async function ensureCatalogMigrated(): Promise<void> {
  if (!migrationPromise) {
    migrationPromise = migrateLegacyCatalogIfNeeded();
  }
  await migrationPromise;
}

async function readLocalSeedCatalog(): Promise<RawGiftRow[] | null> {
  try {
    const { promises: fs } = await import("fs");
    const path = await import("path");
    const filePath = path.join(process.cwd(), "data", LEGACY_CATALOG_PATH);
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as RawGiftRow[];
  } catch {
    return null;
  }
}

async function writeCatalogEntries(rows: RawGiftRow[]): Promise<string[]> {
  const ids: string[] = [];
  const embedded: Record<string, import("@/types/gift").GiftReservation[]> = {};

  for (const row of rows) {
    const gift = normalizeGift(row);
    ids.push(gift.id);
    if (gift.reservas.length > 0) {
      embedded[gift.id] = gift.reservas;
    }
    await writeJson(
      giftCatalogPath(gift.id),
      giftForStorage({ ...gift, reservas: [], estado: "disponible" }),
    );
  }

  await writeJson(MANIFEST_PATH, { ids } satisfies CatalogManifest);
  await migrateEmbeddedReservations(embedded);
  return ids;
}

async function migrateLegacyCatalogIfNeeded(): Promise<void> {
  const manifest = await readJson<CatalogManifest>(MANIFEST_PATH);
  if (manifest?.ids?.length) return;

  const legacy =
    (await readJson<RawGiftRow[]>(LEGACY_CATALOG_PATH)) ??
    (await readLocalSeedCatalog());

  if (!legacy?.length) return;

  await writeCatalogEntries(legacy);
}

export async function readManifestIds(): Promise<string[]> {
  await ensureCatalogMigrated();
  const manifest = await readJson<CatalogManifest>(MANIFEST_PATH);
  return manifest?.ids ?? [];
}

export async function readCatalogRow(id: string): Promise<RawGiftRow | null> {
  await ensureCatalogMigrated();

  const row = await readJson<RawGiftRow>(giftCatalogPath(id));
  if (row) return row;

  const legacy =
    (await readJson<RawGiftRow[]>(LEGACY_CATALOG_PATH)) ??
    (await readLocalSeedCatalog());
  const fromLegacy = legacy?.find((gift) => gift.id === id);
  if (!fromLegacy) return null;

  const gift = normalizeGift(fromLegacy);
  await writeJson(
    giftCatalogPath(id),
    giftForStorage({ ...gift, reservas: [], estado: "disponible" }),
  );
  return fromLegacy;
}

export async function writeCatalogGift(gift: Gift): Promise<void> {
  await writeJson(giftCatalogPath(gift.id), giftForStorage(gift));
}

export async function appendCatalogGift(gift: Gift): Promise<void> {
  const ids = await readManifestIds();
  if (!ids.includes(gift.id)) {
    ids.push(gift.id);
    await writeJson(MANIFEST_PATH, { ids } satisfies CatalogManifest);
  }
  await writeCatalogGift(gift);
}

export async function removeCatalogGift(id: string): Promise<void> {
  const ids = (await readManifestIds()).filter((giftId) => giftId !== id);
  await writeJson(MANIFEST_PATH, { ids } satisfies CatalogManifest);
  await deleteJson(giftCatalogPath(id));
}

/** Restablece el catálogo desde la plantilla del repo (solo admin). */
export async function writeSeedCatalog(rows: RawGiftRow[]): Promise<number> {
  const nextIds = rows.map((row) => normalizeGift(row).id);
  const existing = await listPathnames("gifts/");
  const stale = existing.filter(
    (pathname) =>
      pathname !== MANIFEST_PATH &&
      !nextIds.some((id) => pathname === giftCatalogPath(id)),
  );

  await Promise.all(stale.map((pathname) => deleteJson(pathname)));
  await writeCatalogEntries(rows);
  return rows.length;
}
