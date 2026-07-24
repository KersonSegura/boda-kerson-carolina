import type { Category } from "@/types/category";
import type {
  CreateGiftInput,
  Gift,
  GiftReservation,
  UpdateGiftInput,
} from "@/types/gift";
import { normalizeGiftEmoji } from "@/lib/gift-emoji";
import {
  isGiftAvailable,
  normalizeCantidad,
  normalizeGift,
  syncGiftEstado,
} from "@/lib/gift-model";
import { ensureSchema, getSql } from "@/lib/db";

type RawGiftRow = Parameters<typeof normalizeGift>[0];

interface GiftRow {
  id: string;
  nombre: string;
  emoji: string;
  especificaciones: string;
  cantidad: number;
  categoria_id: string | null;
  sort_order: number;
}

interface ReservationRow {
  gift_id: string;
  nombre: string;
  reservado_en: Date | string;
  request_id: string | null;
}

function safeReservadoEn(value: Date | string | null | undefined): string {
  if (value instanceof Date) {
    if (!Number.isNaN(value.getTime())) return value.toISOString();
  } else if (value != null && value !== "") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
}

function rowToReservation(row: ReservationRow): GiftReservation {
  return {
    nombre: row.nombre,
    reservadoEn: safeReservadoEn(row.reservado_en),
    ...(row.request_id && { requestId: row.request_id }),
  };
}

function mapGiftRow(row: Record<string, unknown>): GiftRow {
  return {
    id: String(row.id ?? ""),
    nombre: String(row.nombre ?? ""),
    emoji: String(row.emoji ?? ""),
    especificaciones: String(row.especificaciones ?? ""),
    cantidad: Number(row.cantidad ?? 1),
    categoria_id: row.categoria_id != null ? String(row.categoria_id) : null,
    sort_order: Number(row.sort_order ?? 0),
  };
}

function assembleGift(row: GiftRow, reservas: GiftReservation[]): Gift {
  if (!row.id) {
    throw new Error(`Regalo sin id en base de datos: ${row.nombre}`);
  }

  const gift = normalizeGift({
    id: row.id,
    nombre: row.nombre,
    emoji: row.emoji,
    especificaciones: row.especificaciones,
    cantidad: row.cantidad,
    categoriaId: row.categoria_id ?? undefined,
    reservas,
  });

  return {
    ...gift,
    reservas,
    estado: syncGiftEstado({ cantidad: gift.cantidad, reservas }),
  };
}

async function readAllReservations(): Promise<Map<string, GiftReservation[]>> {
  const sql = getSql();
  const rows = await sql<ReservationRow[]>`
    SELECT gift_id, nombre, reservado_en, request_id
    FROM reservations
    ORDER BY reservado_en ASC
  `;

  const map = new Map<string, GiftReservation[]>();
  for (const row of rows) {
    const list = map.get(row.gift_id) ?? [];
    list.push(rowToReservation(row));
    map.set(row.gift_id, list);
  }
  return map;
}

async function loadGiftFromDb(id: string): Promise<Gift | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, nombre, emoji, especificaciones, cantidad, categoria_id, sort_order
    FROM gifts
    WHERE id = ${id}
    LIMIT 1
  `) as Record<string, unknown>[];

  if (rows.length === 0) return null;

  const reservationRows = await sql<ReservationRow[]>`
    SELECT gift_id, nombre, reservado_en, request_id
    FROM reservations
    WHERE gift_id = ${id}
    ORDER BY reservado_en ASC
  `;

  return assembleGift(
    mapGiftRow(rows[0]),
    reservationRows.map(rowToReservation),
  );
}

export async function pgGetAllGifts(): Promise<Gift[]> {
  await ensureSchema();
  const sql = getSql();

  const rows = (await sql`
    SELECT id, nombre, emoji, especificaciones, cantidad, categoria_id, sort_order
    FROM gifts
    ORDER BY sort_order ASC, id ASC
  `) as Record<string, unknown>[];

  const reservationsByGift = await readAllReservations();
  return rows.map((row) =>
    assembleGift(mapGiftRow(row), reservationsByGift.get(String(row.id)) ?? []),
  );
}

export async function pgGetGiftById(id: string): Promise<Gift | undefined> {
  await ensureSchema();
  const gift = await loadGiftFromDb(id);
  return gift ?? undefined;
}

export async function pgCreateGift(input: CreateGiftInput): Promise<Gift> {
  await ensureSchema();
  const sql = getSql();

  const id = crypto.randomUUID();
  const gift: Gift = {
    id,
    nombre: input.nombre.trim(),
    emoji: normalizeGiftEmoji(input.emoji),
    especificaciones: input.especificaciones.trim(),
    cantidad: normalizeCantidad(input.cantidad),
    reservas: [],
    estado: "disponible",
    ...(input.categoriaId && { categoriaId: input.categoriaId }),
  };

  const maxRows = await sql<{ max: number | null }[]>`
    SELECT COALESCE(MAX(sort_order), -1) AS max FROM gifts
  `;
  const sortOrder = (maxRows[0]?.max ?? -1) + 1;

  await sql`
    INSERT INTO gifts (id, nombre, emoji, especificaciones, cantidad, categoria_id, sort_order)
    VALUES (
      ${gift.id},
      ${gift.nombre},
      ${gift.emoji ?? ""},
      ${gift.especificaciones},
      ${gift.cantidad},
      ${gift.categoriaId ?? null},
      ${sortOrder}
    )
  `;

  return gift;
}

export async function pgUpdateGift(
  id: string,
  input: UpdateGiftInput,
): Promise<Gift | null> {
  await ensureSchema();
  const sql = getSql();

  const current = await loadGiftFromDb(id);
  if (!current) return null;

  if (input.cantidad !== undefined) {
    const cantidad = normalizeCantidad(input.cantidad);
    if (cantidad < current.reservas.length) {
      throw new Error(
        `La cantidad no puede ser menor que las reservas actuales (${current.reservas.length})`,
      );
    }
  }

  const updated: Gift = {
    ...current,
    ...(input.nombre !== undefined && { nombre: input.nombre.trim() }),
    ...(input.emoji !== undefined && {
      emoji: normalizeGiftEmoji(input.emoji),
    }),
    ...(input.especificaciones !== undefined && {
      especificaciones: input.especificaciones.trim(),
    }),
    ...(input.cantidad !== undefined && {
      cantidad: normalizeCantidad(input.cantidad),
    }),
  };

  if (input.categoriaId === null) {
    delete updated.categoriaId;
  } else if (input.categoriaId !== undefined) {
    updated.categoriaId = input.categoriaId;
  }

  if (input.clearReservas) {
    await sql`DELETE FROM reservations WHERE gift_id = ${id}`;
    updated.reservas = [];
    updated.estado = "disponible";
  } else {
    updated.estado = syncGiftEstado(updated);
  }

  await sql`
    UPDATE gifts
    SET
      nombre = ${updated.nombre},
      emoji = ${updated.emoji ?? ""},
      especificaciones = ${updated.especificaciones},
      cantidad = ${updated.cantidad},
      categoria_id = ${updated.categoriaId ?? null}
    WHERE id = ${id}
  `;

  return updated;
}

export async function pgDeleteGift(id: string): Promise<boolean> {
  await ensureSchema();
  const sql = getSql();
  const deleted = await sql`DELETE FROM gifts WHERE id = ${id} RETURNING id`;
  return deleted.length > 0;
}

export async function pgReserveGift(
  id: string,
  nombre: string,
  requestId?: string,
): Promise<{ gift: Gift } | { error: string }> {
  await ensureSchema();
  const sql = getSql();

  const trimmedName = nombre.trim();
  if (!trimmedName) return { error: "El nombre es requerido" };

  const gift = await loadGiftFromDb(id);
  if (!gift) return { error: "Regalo no encontrado" };

  if (requestId) {
    const existing = await sql<ReservationRow[]>`
      SELECT gift_id, nombre, reservado_en, request_id
      FROM reservations
      WHERE gift_id = ${id} AND request_id = ${requestId}
      LIMIT 1
    `;

    if (existing.length > 0) {
      return { gift };
    }
  }

  if (!isGiftAvailable(gift)) {
    return { error: "Este regalo ya no tiene cupos disponibles" };
  }

  const reservadoEn = new Date().toISOString();

  try {
    await sql`
      INSERT INTO reservations (gift_id, nombre, reservado_en, request_id)
      VALUES (
        ${id},
        ${trimmedName},
        ${reservadoEn},
        ${requestId ?? null}
      )
    `;
  } catch (error) {
    if (requestId && isUniqueViolation(error)) {
      const refreshed = await loadGiftFromDb(id);
      if (refreshed) return { gift: refreshed };
    }
    throw error;
  }

  const updatedReservas: GiftReservation[] = [
    ...gift.reservas,
    {
      nombre: trimmedName,
      reservadoEn,
      ...(requestId && { requestId }),
    },
  ];

  return {
    gift: {
      ...gift,
      reservas: updatedReservas,
      estado: syncGiftEstado({
        cantidad: gift.cantidad,
        reservas: updatedReservas,
      }),
    },
  };
}

function isUniqueViolation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /unique|duplicate key/i.test(message);
}

export async function pgResetCatalogFromSeed(
  rows: RawGiftRow[],
  categories: Category[],
): Promise<number> {
  await ensureSchema();
  const sql = getSql();

  await sql`DELETE FROM reservations`;
  await sql`DELETE FROM gifts`;
  await sql`DELETE FROM categories`;

  for (const category of categories) {
    await sql`
      INSERT INTO categories (id, nombre)
      VALUES (${category.id}, ${category.nombre})
    `;
  }

  let sortOrder = 0;
  for (const row of rows) {
    const gift = normalizeGift(row);
    await sql`
      INSERT INTO gifts (id, nombre, emoji, especificaciones, cantidad, categoria_id, sort_order)
      VALUES (
        ${gift.id},
        ${gift.nombre},
        ${gift.emoji ?? ""},
        ${gift.especificaciones},
        ${gift.cantidad},
        ${gift.categoriaId ?? null},
        ${sortOrder}
      )
    `;
    sortOrder += 1;

    for (const reserva of gift.reservas) {
      await sql`
        INSERT INTO reservations (gift_id, nombre, reservado_en, request_id)
        VALUES (
          ${gift.id},
          ${reserva.nombre},
          ${reserva.reservadoEn},
          ${reserva.requestId ?? null}
        )
      `;
    }
  }

  return rows.length;
}

export async function pgCountGifts(): Promise<number> {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql<{ count: string }[]>`
    SELECT COUNT(*)::text AS count FROM gifts
  `;
  return parseInt(rows[0]?.count ?? "0", 10);
}
