import { findCoverCandidates } from "@/lib/covers";
import { normalizeIsbn } from "@/lib/isbn";

// Renvoie plusieurs couvertures candidates pour un ISBN (l'utilisatrice choisit).
export async function GET(
  request: Request,
  ctx: { params: Promise<{ isbn: string }> },
): Promise<Response> {
  const { isbn: raw } = await ctx.params;
  const isbn = normalizeIsbn(raw);
  if (!isbn) return Response.json({ candidates: [] });

  const url = new URL(request.url);
  const title = url.searchParams.get("title") ?? undefined;
  const author = url.searchParams.get("author") ?? undefined;

  const candidates = await findCoverCandidates(isbn, title, author);
  return Response.json({ candidates });
}
