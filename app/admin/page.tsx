import Link from "next/link";
import { listAdminBookGroups, countByStatus } from "@/lib/books";
import { formatPrice, categoryLabel, conditionLabel, statusLabel, STATUSES } from "@/lib/constants";
import { StatusControl } from "./status-control";
import { QuantityControl } from "./quantity-control";

export const metadata = { title: "Stock" };

export default async function AdminDashboard(props: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await props.searchParams;
  const [groups, counts] = await Promise.all([listAdminBookGroups({ q, status }), countByStatus()]);
  const totalRows = Object.values(counts).reduce((a, b) => a + b, 0);

  const filters = [
    { value: "", label: "Tous", n: totalRows },
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
      <p className="mb-4 text-sm text-muted">
        {groups.length} livre{groups.length > 1 ? "s" : ""}
      </p>

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

      {groups.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-8 text-center text-muted">
          Aucun livre {q ? "pour cette recherche" : status ? "avec ce statut" : ""}.
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface/50">
          {groups.map((g) => {
            const single = g.variants.length === 1 ? g.variants[0] : null;
            return (
              <li key={g.id} className="px-3 py-2.5">
                <Link href={`/admin/livre/${g.id}`} className="flex min-w-0 items-center gap-3">
                  <span className="h-16 w-11 shrink-0 overflow-hidden rounded bg-surface-2 ring-1 ring-line">
                    {g.cover_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={g.cover_url} alt="" className="h-full w-full object-cover" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-serif font-medium">{g.title}</span>
                    <span className="block truncate text-sm text-muted">
                      {g.authors.join(", ") || "—"} · {categoryLabel(g.category)}
                    </span>

                    {single ? (
                      <span className="mt-1 flex items-center gap-2 text-sm">
                        <span className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-xs font-medium text-foreground/80">
                          {conditionLabel(single.condition)}
                        </span>
                        <span className="font-semibold">{formatPrice(single.price)}</span>
                      </span>
                    ) : (
                      <>
                        <span className="mt-1.5 flex flex-wrap gap-1.5">
                          {g.variants.map((v) => (
                            <span
                              key={v.id}
                              className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-xs text-foreground/80"
                            >
                              {conditionLabel(v.condition)} · {formatPrice(v.price)}
                              {v.quantity > 1 ? ` ×${v.quantity}` : ""}
                              {v.status !== "disponible" ? ` · ${statusLabel(v.status)}` : ""}
                            </span>
                          ))}
                        </span>
                        <span className="mt-1 block text-xs text-muted">
                          Qté {g.totalQuantity} · {g.variants.length} états — modifier
                        </span>
                      </>
                    )}
                  </span>
                </Link>

                {/* Réglage rapide qté/statut : uniquement quand il n'y a qu'un état
                    (sinon ça se gère par état dans la fiche). */}
                {single && (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <QuantityControl id={single.id} quantity={single.quantity} />
                    <StatusControl id={single.id} status={single.status} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
