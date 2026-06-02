import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads/covers";
const PUBLIC_BASE = process.env.NEXT_PUBLIC_UPLOAD_BASE_URL ?? "/uploads/covers";
const MAX_BYTES = 8 * 1024 * 1024; // 8 Mo

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Réception de la photo de couverture prise par Laura → écrit sur disque, renvoie l'URL publique.
export async function POST(request: Request): Promise<Response> {
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "Aucun fichier" }, { status: 400 });
  }
  const ext = EXT_BY_TYPE[file.type];
  if (!ext) {
    return Response.json({ error: "Format non supporté (jpg, png, webp)" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Fichier trop volumineux (max 8 Mo)" }, { status: 413 });
  }

  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);

  return Response.json({ url: `${PUBLIC_BASE}/${filename}` });
}
