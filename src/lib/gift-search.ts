/** Normaliza texto para búsqueda sin distinguir acentos ni mayúsculas. */
export function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** Coincide si todas las palabras del query aparecen en el nombre del regalo. */
export function matchesGiftSearch(nombre: string, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  const normalizedName = normalizeSearchText(nombre);
  return normalizedQuery
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => normalizedName.includes(word));
}
