import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

// Stockage local + optimisation des couvertures.
// On rapatrie les couvertures externes et les photos de Laura en WebP redimensionné,
// servi depuis notre propre serveur (rapide, caché, sans dépendance/hotlink externe).

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads/covers";
const PUBLIC_BASE = process.env.NEXT_PUBLIC_UPLOAD_BASE_URL ?? "/uploads/covers";
const COVER_WIDTH = 600; // suffisant pour la grille + la fiche
const PHOTO_WIDTH = 1000; // photo réelle de Laura, un peu plus grande
const FETCH_TIMEOUT_MS = 8_000;

async function saveWebp(buffer: Buffer, maxWidth: number): Promise<string> {
  const out = await sharp(buffer)
    .rotate() // respecte l'orientation EXIF (photos de téléphone)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  const filename = `${randomUUID()}.webp`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, filename), out);
  return `${PUBLIC_BASE}/${filename}`;
}

/** Photo prise/uploadée par Laura → WebP optimisé. */
export async function storeUploadedImage(buffer: Buffer): Promise<string> {
  return saveWebp(buffer, PHOTO_WIDTH);
}

/** Une couverture est-elle déjà locale (pas une URL externe) ? */
export function isLocalCover(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith(PUBLIC_BASE) || url.startsWith("/uploads/");
}

/**
 * Télécharge une couverture externe, la redimensionne et la stocke en local.
 * Renvoie l'URL locale, ou null si échec (l'appelant gardera alors l'URL externe).
 */
export async function fetchAndStoreCover(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") ?? "").startsWith("image/")) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength < 1000) return null; // garde-fou anti-placeholder
    return await saveWebp(buffer, COVER_WIDTH);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Rapatrie la couverture si elle est externe ; sinon la laisse telle quelle. */
export async function localizeCover(coverUrl: string | null): Promise<string | null> {
  if (!coverUrl || isLocalCover(coverUrl) || !/^https?:\/\//i.test(coverUrl)) return coverUrl;
  const local = await fetchAndStoreCover(coverUrl);
  return local ?? coverUrl; // fallback : on garde l'externe si le rapatriement échoue
}
