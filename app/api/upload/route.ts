import { storeUploadedImage } from "@/lib/images";

const MAX_BYTES = 12 * 1024 * 1024; // 12 Mo (photo brute de téléphone avant compression)

// Réception de la photo de couverture prise par Laura → redimensionnée en WebP,
// écrite sur disque, renvoie l'URL publique locale.
export async function POST(request: Request): Promise<Response> {
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "Aucun fichier" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return Response.json({ error: "Le fichier n'est pas une image" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Fichier trop volumineux (max 12 Mo)" }, { status: 413 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await storeUploadedImage(buffer);
    return Response.json({ url });
  } catch {
    return Response.json({ error: "Image illisible" }, { status: 400 });
  }
}
