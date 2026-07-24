import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { put } from "@vercel/blob";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnvFile(filename) {
  try {
    const content = readFileSync(path.join(root, filename), "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional file
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
if (!token) {
  console.error(
    "Falta BLOB_READ_WRITE_TOKEN. Cópialo desde Vercel → Storage → .env.local",
  );
  process.exit(1);
}

const auth = { token };
const blobOptions = {
  access: "public",
  addRandomSuffix: false,
  allowOverwrite: true,
  contentType: "application/json",
};

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8"));
}

function giftForStorage(gift) {
  const stored = {
    id: String(gift.id),
    nombre: String(gift.nombre ?? "").trim(),
    emoji: String(gift.emoji ?? "").trim(),
    especificaciones: String(gift.especificaciones ?? "").trim(),
    cantidad: Math.min(Math.max(parseInt(String(gift.cantidad ?? 1), 10) || 1, 1), 99),
  };
  if (gift.categoriaId) stored.categoriaId = String(gift.categoriaId);
  return stored;
}

async function writeJson(pathname, data) {
  await put(pathname, JSON.stringify(data, null, 2), {
    ...blobOptions,
    ...auth,
  });
}

const gifts = readJson("data/gifts.json");
const categories = readJson("data/categories.json");
const version = readJson("data/catalog-version.json");

const ids = gifts.map((gift) => String(gift.id));

console.log(`Sembrando ${gifts.length} regalos y ${categories.length} categorías...`);

await writeJson("gifts/manifest.json", { ids });
await writeJson("categories.json", categories);
await writeJson("catalog-version.json", version);

for (const gift of gifts) {
  await writeJson(`gifts/${gift.id}.json`, giftForStorage(gift));
  process.stdout.write(".");
}

console.log("\nListo. Recarga https://boda-kerson-carolina.vercel.app/");
