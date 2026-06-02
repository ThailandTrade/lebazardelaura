import { lookupIsbn, normalizeIsbn, type IsbnLookupResult } from "@/lib/isbn";

// Lookup serveur des métadonnées d'un livre par ISBN (cascade Google Books → Open Library).
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ isbn: string }> },
): Promise<Response> {
  const { isbn: rawIsbn } = await ctx.params;
  const isbn = normalizeIsbn(rawIsbn);

  if (!isbn) {
    return Response.json(
      { error: "ISBN invalide" } satisfies { error: string },
      { status: 400 },
    );
  }

  const result: IsbnLookupResult = await lookupIsbn(isbn);
  return Response.json(result);
}
