import Link from "next/link";
import { notFound } from "next/navigation";
import { getBook, findAllByIsbn } from "@/lib/books";
import { BookForm } from "../../book-form";
import { updateBookAction, deleteBookAction } from "../../book-actions";

export const metadata = { title: "Modifier un livre — Le bazar de Laura" };

export default async function EditBookPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const book = await getBook(id);
  if (!book) notFound();

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
      <Link href="/admin" className="text-sm text-muted underline-offset-4 hover:underline">
        ← Tableau de bord
      </Link>
      <h1 className="mb-6 mt-2 font-serif text-3xl tracking-tight">Modifier le livre</h1>

      <BookForm action={update} initial={{ ...book, variants }} submitLabel="Mettre à jour" />

      <form action={remove} className="mt-8 border-t border-line pt-6">
        <button className="text-sm text-red-600 underline">
          Supprimer ce livre{variants.length > 1 ? ` (et ses ${variants.length} états)` : ""}
        </button>
      </form>
    </main>
  );
}
