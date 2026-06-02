import Link from "next/link";
import { listAdminBooks, countByStatus } from "@/lib/books";
import { formatPrice, categoryLabel, STATUSES } from "@/lib/constants";
import { StatusControl } from "./status-control";
import { QuantityControl } from "./quantity-control";

export const metadata = { title: "Stock" };

export default async function AdminDashboard(props: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await props.searchParams;
  const [books, counts] = await Promise.all([listAdminBooks({ q, status }), countByStatus()]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const filters = [
    { value: "", label: "Tous", n: total },
    ...STATUSES.map((s) => ({ value: s.value, label: s.label, n: counts[s.value] ?? 0 })),
  ];
  const qs = (st: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (st) p.set("status", st);
    const s = p.toString();
    return s ? `/admin?${s}` : "/admin";
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-5">
      <h1 className="font-serif text-2xl">Stock</h1>
      <p className="mb-4 text-sm text-muted">{total} livre{total > 1 ? "s" : ""} au total</p>

      <form className="mb-3">
        {status && <input type="hidden" name="status" value={status} />}
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Rechercher (titre, auteur, ISBN)…"
          className="w-full rounded-lg border border-line bg-surface px-3 py-2.5"
        />
      </form>

      {/* Filtres statut (défilables horizontalement) */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => {
          const active = (status ?? "") === f.value;
          return (
            <Link
              key={f.value || "all"}
              href={qs(f.value)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm ${
                active ? "border-accent bg-accent text-white" : "border-line bg-surface text-muted"
              }`}
            >
              {f.label} <span className={active ? "text-white/80" : "text-muted/70"}>{f.n}</span>
            </Link>
          );
        })}
      </div>

      {books.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-8 text-center text-muted">
          Aucun livre {q ? "pour cette recherche" : status ? "avec ce statut" : ""}.
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface/50">
          {books.map((b) => (
            <li key={b.id} className="px-3 py-2.5">
              <Link href={`/admin/livre/${b.id}`} className="flex min-w-0 items-center gap-3">
                <span className="h-16 w-11 shrink-0 overflow-hidden rounded bg-surface-2 ring-1 ring-line">
                  {b.cover_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.cover_url} alt="" className="h-full w-full object-cover" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-serif font-medium">{b.title}</span>
                  <span className="block truncate text-sm text-muted">
                    {b.authors.join(", ") || "—"} · {categoryLabel(b.category)} · {formatPrice(b.price)}
                  </span>
                </span>
              </Link>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <QuantityControl id={b.id} quantity={b.quantity} />
                <StatusControl id={b.id} status={b.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
