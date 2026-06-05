import { listPublicBookGroups } from "@/lib/books";
import { CATEGORIES } from "@/lib/constants";
import { BookCard } from "@/components/book-card";
import { getServerLocale } from "@/lib/i18n-server";
import { getDict, catLabel } from "@/lib/i18n";

export const metadata = { title: "Ma bibliothèque — Le bazar de Laura" };

const field = "rounded-md border border-line bg-surface px-3 py-2 text-[15px] placeholder:text-muted/70";

export default async function CataloguePage(props: {
  searchParams: Promise<{ category?: string; q?: string; min?: string; max?: string }>;
}) {
  const locale = await getServerLocale();
  const t = getDict(locale);
  const sp = await props.searchParams;
  const books = await listPublicBookGroups({
    category: sp.category,
    q: sp.q,
    minPrice: sp.min ? Number(sp.min) : undefined,
    maxPrice: sp.max ? Number(sp.max) : undefined,
  });

  return (
    <main className="mx-auto max-w-5xl px-5 py-12 sm:px-6">
      <header className="mb-8">
        <h1 className="rule-accent font-serif text-3xl tracking-tight sm:text-4xl">{t.cat_title}</h1>
        <p className="mt-4 max-w-xl text-muted">{t.cat_subtitle}</p>
      </header>

      <form className="mb-10 rounded-xl border border-line bg-surface-2/60 p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <input name="q" defaultValue={sp.q ?? ""} placeholder={t.cat_search} className={`col-span-2 sm:col-span-1 ${field}`} />
          <select name="category" defaultValue={sp.category ?? ""} className={field}>
            <option value="">{t.cat_all}</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {catLabel(c.value, locale)}
              </option>
            ))}
          </select>
          <input name="min" defaultValue={sp.min ?? ""} inputMode="numeric" placeholder={t.cat_min} className={field} />
          <input name="max" defaultValue={sp.max ?? ""} inputMode="numeric" placeholder={t.cat_max} className={field} />
        </div>
        <div className="mt-3 flex justify-end">
          <button className="rounded-full bg-foreground px-6 py-2 text-sm font-medium text-white transition hover:bg-accent">
            {t.cat_filter}
          </button>
        </div>
      </form>

      <p className="mb-6 text-sm text-muted">{t.cat_count(books.length)}</p>

      {books.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-8 text-center text-muted">{t.cat_empty}</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {books.map((b) => (
            <BookCard key={b.id} book={b} t={t} locale={locale} />
          ))}
        </div>
      )}
    </main>
  );
}
