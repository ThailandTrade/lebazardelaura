import { findAllByIsbn } from "@/lib/books";
import { lookupIsbn, normalizeIsbn } from "@/lib/isbn";

// Pour le flux de scan : renvoie en un appel les lignes déjà en stock pour cet ISBN
// (chacune avec son état/prix/quantité) ET les métadonnées de la cascade ISBN.
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ isbn: string }> },
): Promise<Response> {
  const { isbn: raw } = await ctx.params;
  const isbn = normalizeIsbn(raw);
  if (!isbn) return Response.json({ error: "ISBN invalide" }, { status: 400 });

  const existing = await findAllByIsbn(isbn);
  const lookup = await lookupIsbn(isbn);

  return Response.json({ isbn, existing, lookup });
}
