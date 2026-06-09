import Link from "next/link";
import { listPublicBookGroups, type PublicBookGroup } from "@/lib/books";
import { CATEGORIES } from "@/lib/constants";
import { BookCard } from "@/components/book-card";
import { getServerLocale } from "@/lib/i18n-server";
import { getDict, catLabel, fmt, plural } from "@/lib/i18n";

export const metadata = { title: "Ma bibliothèque — Le bazar de Laura" };

const field = "rounded-md border border-line bg-surface px-3 py-2 text-[15px] placeholder:text-muted/70";
const PREVIEW = 6; // nombre de livres montrés par rayon (vue par catégories)

export default async function CataloguePage(props: {
  searchParams: Promise<{ category?: string; q?: string; min?: string; max?: string }>;
}) {
  const locale = await getServerLocale();
  const t = getDict(locale);
  const sp = await props.searchParams;
  const filtered = !!(sp.category || sp.q || sp.min || sp.max);

  // Vue par catégories (par défaut) : tous les livres, regroupés par catégorie.
  const allGroups = filtered ? [] : await listPublicBookGroups();
  const byCategory = new Map<string, PublicBookGroup[]>();
  for (const g of allGroups) {
    const arr = byCategory.get(g.category) ?? [];
    arr.push(g);
    byCategory.set(g.category, arr);
  }

  // Vue filtrée : grille classique triée (par auteur/titre si catégorie).
  const books = filtered
    ? await listPublicBookGroups({
        category: sp.category,
        q: sp.q,
        minPrice: sp.min ? Number(sp.min) : undefined,
        maxPrice: sp.max ? Number(sp.max) : undefined,
      })
    : [];

  return (
    <main className="mx-auto max-w-5xl px-5 py-12 sm:px-6">
      <header className="mb-8">
        <h1 className="rule-accent font-serif text-3xl tracking-tight sm:text-4xl">{t.cat_title}</h1>
        <p className="mt-4 max-w-xl text-justify text-muted">{t.cat_subtitle}</p>
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

      {filtered ? (
        // --- Vue filtrée : grille ---
        <>
          <p className="mb-6 text-sm text-muted">{fmt(t.cat_count, { n: books.length, s: plural(books.length) })}</p>
          {books.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line p-8 text-center text-muted">{t.cat_empty}</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {books.map((b) => (
                <BookCard key={b.id} book={b} t={t} locale={locale} />
              ))}
            </div>
          )}
        </>
      ) : (
        // --- Vue par catégories : un rayon par catégorie qui a des livres ---
        <div className="flex flex-col gap-12">
          {CATEGORIES.filter((c) => byCategory.has(c.value)).map((c) => {
            const list = byCategory.get(c.value)!;
            const shown = list.slice(0, PREVIEW);
            const hasMore = list.length > PREVIEW;
            return (
              <section key={c.value}>
                <div className="mb-4 flex items-baseline justify-between gap-4">
                  <h2 className="rule-accent font-serif text-2xl">{catLabel(c.value, locale)}</h2>
                  {hasMore && (
                    <Link
                      href={`/catalogue?category=${c.value}`}
                      className="shrink-0 text-sm text-muted underline-offset-4 hover:text-accent hover:underline"
                    >
                      {t.see_more}
                    </Link>
                  )}
                </div>
                <div className="-mx-1 flex gap-5 overflow-x-auto px-1 pb-2">
                  {shown.map((b) => (
                    <div key={b.id} className="w-[136px] shrink-0 sm:w-[150px]">
                      <BookCard book={b} t={t} locale={locale} />
                    </div>
                  ))}
                  {hasMore && (
                    <Link
                      href={`/catalogue?category=${c.value}`}
                      className="flex w-[136px] shrink-0 flex-col sm:w-[150px]"
                    >
                      <div className="flex aspect-[2/3] items-center justify-center rounded-md border border-dashed border-line bg-surface-2/40 px-3 text-center text-sm font-medium text-accent transition hover:bg-surface-2">
                        {t.see_more}
                      </div>
                    </Link>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
