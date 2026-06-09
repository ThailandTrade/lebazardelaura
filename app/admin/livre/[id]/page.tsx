import Link from "next/link";
import { notFound } from "next/navigation";
import { getBook, findAllByIsbn, listAdminBookGroups } from "@/lib/books";
import { BookForm } from "../../book-form";
import { updateBookAction, deleteBookAction } from "../../book-actions";

export const metadata = { title: "Modifier un livre — Le bazar de Laura" };

export default async function EditBookPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ category?: string; q?: string; status?: string }>;
}) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const book = await getBook(id);
  if (!book) notFound();

  // Précédent / suivant dans la liste (même contexte : rayon/recherche/statut).
  const ctxParams = new URLSearchParams();
  if (sp.category) ctxParams.set("category", sp.category);
  if (sp.q) ctxParams.set("q", sp.q);
  if (sp.status) ctxParams.set("status", sp.status);
  const ctx = ctxParams.toString();
  const siblings = await listAdminBookGroups({ category: sp.category, q: sp.q, status: sp.status });
  const idx = siblings.findIndex((g) => g.id === id);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;
  const navLink = (gid: string) => `/admin/livre/${gid}${ctx ? `?${ctx}` : ""}`;
  const listUrl = ctx ? `/admin?${ctx}` : "/admin";

  // Tous les états du titre (mêmes ISBN) → édités ensemble sur une seule fiche.
  const rows = book.isbn ? await findAllByIsbn(book.isbn) : [book];
  const variants = rows.map((r) => ({
    id: r.id,
    condition: r.condition,
    price: r.price,
    status: r.status,
    quantity: r.quantity,
    entry_date: r.entry_date,
    exit_date: r.exit_date,
  }));

  const update = updateBookAction.bind(null, id);
  const remove = deleteBookAction.bind(null, id);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link href={listUrl} className="text-sm text-muted underline-offset-4 hover:underline">
        ← Retour
      </Link>

      {(prev || next) && (
        <nav className="mt-2 flex items-center justify-between gap-3 text-sm">
          {prev ? (
            <Link href={navLink(prev.id)} title={prev.title} className="flex min-w-0 items-center gap-1 text-muted hover:text-accent">
              <span aria-hidden>←</span>
              <span className="truncate">{prev.title}</span>
            </Link>
          ) : (
            <span className="text-muted/30" aria-hidden>←</span>
          )}
          {next ? (
            <Link href={navLink(next.id)} title={next.title} className="flex min-w-0 items-center justify-end gap-1 text-right text-muted hover:text-accent">
              <span className="truncate">{next.title}</span>
              <span aria-hidden>→</span>
            </Link>
          ) : (
            <span className="text-muted/30" aria-hidden>→</span>
          )}
        </nav>
      )}

      <h1 className="mb-6 mt-3 font-serif text-3xl tracking-tight">Modifier le livre</h1>

      <BookForm action={update} initial={{ ...book, variants }} submitLabel="Mettre à jour" />

      <form action={remove} className="mt-8 border-t border-line pt-6">
        <button className="text-sm text-red-600 underline">
          Supprimer ce livre{variants.length > 1 ? ` (et ses ${variants.length} états)` : ""}
        </button>
      </form>
    </main>
  );
}
