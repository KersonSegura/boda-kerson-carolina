export function storageErrorResponse(error: unknown, fallback: string) {
  const detail = error instanceof Error ? error.message : fallback;
  const isDbBlocked =
    /connect|ECONNREFUSED|timeout|postgres|database|SSL/i.test(detail);

  return {
    message: isDbBlocked
      ? "No se pudo conectar con la base de datos. Revisa que POSTGRES_URL esté configurada en Vercel y redeploy."
      : detail,
    status: isDbBlocked ? 503 : 500,
  };
}
