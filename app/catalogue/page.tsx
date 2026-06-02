import { listPublicBooks } from "@/lib/books";
import { CATEGORIES } from "@/lib/constants";
import { BookCard } from "@/components/book-card";

export const metadata = { title: "Catalogue — Le bazar de Laura" };

const field = "rounded-md border border-line bg-surface px-3 py-2 text-[15px] placeholder:text-muted/70";

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
    <main className="mx-auto max-w-5xl px-5 py-12 sm:px-6">
      <header className="mb-8">
        <h1 className="rule-accent font-serif text-3xl tracking-tight sm:text-4xl">Le catalogue</h1>
        <p className="mt-4 max-w-xl text-muted">
          Des livres français d&apos;occasion, chinés un par un. Un coup de cœur ? Ouvrez la fiche et
          écrivez à Laura.
        </p>
      </header>

      <form className="mb-10 rounded-xl border border-line bg-surface-2/60 p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <input name="q" defaultValue={sp.q ?? ""} placeholder="Titre ou auteur" className={`col-span-2 sm:col-span-1 ${field}`} />
          <select name="category" defaultValue={sp.category ?? ""} className={field}>
            <option value="">Toutes catégories</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <input name="min" defaultValue={sp.min ?? ""} inputMode="numeric" placeholder="Prix min ฿" className={field} />
          <input name="max" defaultValue={sp.max ?? ""} inputMode="numeric" placeholder="Prix max ฿" className={field} />
        </div>
        <div className="mt-3 flex justify-end">
          <button className="rounded-full bg-foreground px-6 py-2 text-sm font-medium text-white transition hover:bg-accent">
            Filtrer
          </button>
        </div>
      </form>

      <p className="mb-6 text-sm text-muted">
        {books.length} livre{books.length > 1 ? "s" : ""} disponible{books.length > 1 ? "s" : ""}
      </p>

      {books.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-8 text-center text-muted">
          Aucun livre ne correspond pour le moment. Essayez d&apos;élargir la recherche.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {books.map((b) => (
            <BookCard key={b.id} book={b} />
          ))}
        </div>
      )}
    </main>
  );
}
