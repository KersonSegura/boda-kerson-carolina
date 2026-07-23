export async function fetchJson<T>(
  url: string,
  options?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, options);
    const text = await res.text();

    let data: T | { error?: string } | null = null;
    if (text) {
      try {
        data = JSON.parse(text) as T;
      } catch {
        return { ok: false, error: "No se pudo procesar la respuesta del servidor" };
      }
    }

    if (!res.ok) {
      const message =
        data && typeof data === "object" && "error" in data && data.error
          ? String(data.error)
          : "Ocurrió un error. Intenta de nuevo.";
      return { ok: false, error: message };
    }

    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: "No se pudo conectar con el servidor" };
  }
}
