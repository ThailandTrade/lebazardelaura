import Link from "next/link";
import { listPublicBooks } from "@/lib/books";
import { BookCard } from "@/components/book-card";

export default async function HomePage() {
  const latest = (await listPublicBooks()).slice(0, 8);

  return (
    <main>
      <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-24">
        <h1 className="font-serif text-4xl leading-tight sm:text-5xl">
          Des livres français, chinés avec soin.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
          Le bazar de Laura, c&apos;est une petite librairie d&apos;occasion qui voyage de marché en
          marché à Bangkok. Parcourez la collection, et si un livre vous fait de l&apos;œil, écrivez-moi.
        </p>
        <Link
          href="/catalogue"
          className="mt-8 inline-block rounded-full bg-accent px-7 py-3 font-medium text-white"
        >
          Voir le catalogue
        </Link>
      </section>

      {latest.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="font-serif text-2xl">Derniers arrivages</h2>
            <Link href="/catalogue" className="text-sm text-muted hover:text-accent">
              Tout voir →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4">
            {latest.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
