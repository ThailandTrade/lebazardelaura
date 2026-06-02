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
    <main className="mx-auto max-w-4xl px-5 py-10 sm:px-6">
      <Link href="/catalogue" className="text-sm text-muted underline-offset-4 hover:underline">
        ← Retour au catalogue
      </Link>

      <div className="mt-6 grid gap-10 sm:grid-cols-[260px_1fr]">
        {/* Couverture */}
        <div>
          <div className="overflow-hidden rounded-lg bg-surface-2 shadow-[0_8px_28px_rgba(43,37,29,0.18)] ring-1 ring-line">
            <div className="aspect-[2/3]">
              {book.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={book.cover_url} alt={`Couverture de ${book.title}`} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center p-5 text-center font-serif text-muted">
                  {book.title}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Infos */}
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-muted">{categoryLabel(book.category)}</p>
          <h1 className="mt-2 font-serif text-3xl leading-tight tracking-tight">{book.title}</h1>
          {book.subtitle && <p className="mt-2 font-serif text-lg italic text-muted">{book.subtitle}</p>}
          {book.authors.length > 0 && <p className="mt-3 text-[15px]">{book.authors.join(", ")}</p>}

          <div className="mt-6 flex items-center gap-3">
            <span className="font-serif text-3xl text-accent">{formatPrice(book.price)}</span>
            {book.status === "reserve" && (
              <span className="rounded-sm bg-foreground/85 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-white">
                Réservé
              </span>
            )}
          </div>

          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <Meta label="État" value={conditionLabel(book.condition)} />
            {book.publisher && <Meta label="Éditeur" value={book.publisher} />}
            {book.published_date && <Meta label="Parution" value={book.published_date} />}
            {book.page_count ? <Meta label="Pages" value={String(book.page_count)} /> : null}
          </dl>

          <div className="mt-8">
            <ContactButtons title={book.title} priceLabel={formatPrice(book.price)} />
          </div>
        </div>
      </div>

      {book.description && (
        <section className="mt-12 max-w-2xl">
          <h2 className="rule-accent font-serif text-xl">Présentation</h2>
          <p className="mt-4 whitespace-pre-line leading-relaxed text-foreground/90">{book.description}</p>
        </section>
      )}
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd>{value}</dd>
    </>
  );
}
