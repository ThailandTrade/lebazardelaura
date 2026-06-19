import Link from "next/link";
import { listPublicBookGroups, type PublicBookGroup } from "@/lib/books";
import { CATEGORIES } from "@/lib/constants";
import { BookCard } from "@/components/book-card";
import { getServerLocale } from "@/lib/i18n-server";
import { getDict, catLabel, fmt, plural } from "@/lib/i18n";

export const metadata = { title: "Ma bibliothèque — Le bazar de Laura" };

const field = "rounded-md border border-line bg-surface px-3 py-2 text-[15px] placeholder:text-muted/70";
const PREVIEW = 5; // livres montrés par rayon (+ « voir plus » = 6 → tient sur une ligne)

// Ordre d'affichage des rayons sur la page bibliothèque : ces catégories d'abord,
// le reste ensuite (dans l'ordre de CATEGORIES).
const SECTION_ORDER = ["enfants", "jeunesse", "romans_jeunesse", "bd_manga", "roman"];

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
  // Rayons à afficher, dans l'ordre voulu : SECTION_ORDER d'abord, puis le reste.
  const orderedCats = [
    ...SECTION_ORDER,
    ...CATEGORIES.map((c) => c.value).filter((v) => !SECTION_ORDER.includes(v)),
  ].filter((v) => byCategory.has(v));

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
        {sp.category && <input type="hidden" name="category" value={sp.category} />}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <input name="q" defaultValue={sp.q ?? ""} placeholder={t.cat_search} className={`col-span-2 sm:col-span-1 ${field}`} />
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
          <Link
            href="/catalogue"
            className="text-sm text-muted underline-offset-4 hover:text-accent hover:underline"
          >
            {t.book_back}
          </Link>
          {sp.category && (
            <h2 className="rule-accent mt-3 font-serif text-2xl">{catLabel(sp.category, locale)}</h2>
          )}
          <p className="mb-6 mt-3 text-sm text-muted">{fmt(t.cat_count, { n: books.length, s: plural(books.length) })}</p>
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
          {orderedCats.map((cat) => {
            const list = byCategory.get(cat)!;
            const shown = list.slice(0, PREVIEW);
            const hasMore = list.length > PREVIEW;
            return (
              <section key={cat}>
                <div className="mb-4 flex items-baseline justify-between gap-4">
                  <h2 className="rule-accent font-serif text-2xl">{catLabel(cat, locale)}</h2>
                  {hasMore && (
                    <Link
                      href={`/catalogue?category=${cat}`}
                      className="shrink-0 text-sm text-muted underline-offset-4 hover:text-accent hover:underline"
                    >
                      {t.see_more}
                    </Link>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-6">
                  {shown.map((b) => (
                    <BookCard key={b.id} book={b} t={t} locale={locale} />
                  ))}
                  {hasMore && (
                    <Link href={`/catalogue?category=${cat}`} className="flex flex-col">
                      <div className="flex aspect-[2/3] items-center justify-center rounded-md border border-dashed border-line bg-surface-2/40 px-2 text-center text-sm font-medium text-accent transition hover:bg-surface-2">
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
