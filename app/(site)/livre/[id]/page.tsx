import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicBook, getPublicBookGroup } from "@/lib/books";
import { getServerLocale } from "@/lib/i18n-server";
import { getDict, catLabel } from "@/lib/i18n";
import { Availability } from "./availability";

export async function generateMetadata(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const book = await getPublicBook(id);
  return { title: book ? `${book.title} — Le bazar de Laura` : "Livre — Le bazar de Laura" };
}

export default async function BookPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const locale = await getServerLocale();
  const t = getDict(locale);
  const book = await getPublicBookGroup(id);
  if (!book) notFound();

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 sm:px-6">
      <Link href="/catalogue" className="text-sm text-muted underline-offset-4 hover:underline">
        {t.book_back}
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
          <p className="text-sm uppercase tracking-[0.18em] text-muted">{catLabel(book.category, locale)}</p>
          <h1 className="mt-2 font-serif text-3xl leading-tight tracking-tight">{book.title}</h1>
          {book.subtitle && <p className="mt-2 font-serif text-lg italic text-muted">{book.subtitle}</p>}
          {book.authors.length > 0 && <p className="mt-3 text-[15px]">{book.authors.join(", ")}</p>}

          <Availability variants={book.variants} title={book.title} cover_url={book.cover_url} t={t} locale={locale} />

          <dl className="mt-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            {book.publisher && <Meta label={t.book_publisher} value={book.publisher} />}
            {book.published_date && <Meta label={t.book_published} value={book.published_date} />}
            {book.page_count ? <Meta label={t.book_pages} value={String(book.page_count)} /> : null}
            {book.isbn && <Meta label="ISBN" value={book.isbn} />}
          </dl>
        </div>
      </div>

      {book.description && (
        <section className="mt-12 max-w-2xl">
          <h2 className="rule-accent font-serif text-xl">{t.book_words}</h2>
          <p className="mt-4 whitespace-pre-line text-justify leading-relaxed text-foreground/90">{book.description}</p>
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
