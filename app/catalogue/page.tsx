import { listPublicBooks } from "@/lib/books";
import { CATEGORIES } from "@/lib/constants";
import { BookCard } from "@/components/book-card";

export const metadata = { title: "Catalogue — Le bazar de Laura" };

export default async function CataloguePage(props: {
  searchParams: Promise<{ category?: string; q?: string; min?: string; max?: string }>;
}) {
  const sp = await props.searchParams;
  const books = await listPublicBooks({
    category: sp.category,
    q: sp.q,
    minPrice: sp.min ? Number(sp.min) : undefined,
    maxPrice: sp.max ? Number(sp.max) : undefined,
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="mb-2 font-serif text-3xl">Le catalogue</h1>
      <p className="mb-8 text-neutral-600">
        Des livres français d&apos;occasion, chinés avec soin. Un coup de cœur ? Écrivez à Laura.
      </p>

      <form className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Titre ou auteur"
          className="col-span-2 rounded border border-neutral-300 px-3 py-2 sm:col-span-1"
        />
        <select
          name="category"
          defaultValue={sp.category ?? ""}
          className="rounded border border-neutral-300 px-3 py-2"
        >
          <option value="">Toutes catégories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <input name="min" defaultValue={sp.min ?? ""} inputMode="numeric" placeholder="Prix min" className="rounded border border-neutral-300 px-3 py-2" />
        <input name="max" defaultValue={sp.max ?? ""} inputMode="numeric" placeholder="Prix max" className="rounded border border-neutral-300 px-3 py-2" />
        <button className="col-span-2 rounded bg-neutral-900 px-4 py-2 text-white sm:col-span-4">
          Filtrer
        </button>
      </form>

      {books.length === 0 ? (
        <p className="text-neutral-500">Aucun livre ne correspond pour le moment.</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4">
          {books.map((b) => (
            <BookCard key={b.id} book={b} />
          ))}
        </div>
      )}
    </main>
  );
}
