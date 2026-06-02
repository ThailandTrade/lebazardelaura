import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicBook } from "@/lib/books";
import { formatPrice, categoryLabel, conditionLabel } from "@/lib/constants";
import { ContactButtons } from "./contact-buttons";

export async function generateMetadata(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const book = await getPublicBook(id);
  return { title: book ? `${book.title} — Le bazar de Laura` : "Livre — Le bazar de Laura" };
}

export default async function BookPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const book = await getPublicBook(id);
  if (!book) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/catalogue" className="text-sm text-neutral-500 hover:underline">
        ← Retour au catalogue
      </Link>

      <div className="mt-4 flex flex-col gap-8 sm:flex-row">
        <div className="mx-auto w-48 shrink-0 sm:mx-0">
          <div className="aspect-[2/3] overflow-hidden rounded-lg bg-neutral-100 shadow-sm">
            {book.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={book.cover_url} alt={`Couverture de ${book.title}`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center p-4 text-center text-neutral-400">
                {book.title}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1">
          <h1 className="font-serif text-2xl leading-tight">{book.title}</h1>
          {book.subtitle && <p className="mt-1 text-lg text-neutral-600">{book.subtitle}</p>}
          {book.authors.length > 0 && (
            <p className="mt-2 text-neutral-700">{book.authors.join(", ")}</p>
          )}

          <p className="mt-4 text-2xl font-semibold">{formatPrice(book.price)}</p>
          {book.status === "reserve" && (
            <p className="mt-1 text-sm text-amber-700">Actuellement réservé</p>
          )}

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-neutral-600">
            <dt className="text-neutral-400">État</dt>
            <dd>{conditionLabel(book.condition)}</dd>
            <dt className="text-neutral-400">Catégorie</dt>
            <dd>{categoryLabel(book.category)}</dd>
            {book.publisher && (<><dt className="text-neutral-400">Éditeur</dt><dd>{book.publisher}</dd></>)}
            {book.published_date && (<><dt className="text-neutral-400">Parution</dt><dd>{book.published_date}</dd></>)}
            {book.page_count && (<><dt className="text-neutral-400">Pages</dt><dd>{book.page_count}</dd></>)}
          </dl>

          <div className="mt-6">
            <ContactButtons title={book.title} priceLabel={formatPrice(book.price)} />
          </div>
        </div>
      </div>

      {book.description && (
        <section className="mt-10">
          <h2 className="mb-2 font-serif text-xl">Présentation</h2>
          <p className="whitespace-pre-line leading-relaxed text-neutral-700">{book.description}</p>
        </section>
      )}
    </main>
  );
}
