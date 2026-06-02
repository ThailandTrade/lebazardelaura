import { findByIsbn } from "@/lib/books";
import { lookupIsbn, normalizeIsbn } from "@/lib/isbn";

// Pour le flux de scan : renvoie en un appel le doublon éventuel (déjà en stock)
// ET les métadonnées récupérées par la cascade ISBN.
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ isbn: string }> },
): Promise<Response> {
  const { isbn: raw } = await ctx.params;
  const isbn = normalizeIsbn(raw);
  if (!isbn) return Response.json({ error: "ISBN invalide" }, { status: 400 });

  const row = await findByIsbn(isbn);
  const existing = row ? { id: row.id, title: row.title, status: row.status } : null;
  const lookup = await lookupIsbn(isbn);

  return Response.json({ isbn, existing, lookup });
}
