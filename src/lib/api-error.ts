import { BlobReadError } from "@/lib/json-storage";

export function storageErrorResponse(error: unknown, fallback: string) {
  const detail = error instanceof Error ? error.message : fallback;
  const isBlobBlocked =
    error instanceof BlobReadError &&
    /403|suspended|blocked|forbidden/i.test(detail);

  return {
    message: isBlobBlocked
      ? "El almacenamiento Blob devolvió 403. En Vercel → Storage → tu Blob → pestaña \".env.local\" copia BLOB_READ_WRITE_TOKEN y agrégalo en Settings → Environment Variables del proyecto. Luego redeploy."
      : detail,
    status: isBlobBlocked ? 503 : 500,
  };
}
