import Link from "next/link";
import { listAdminBooks } from "@/lib/books";
import { formatPrice, categoryLabel, statusLabel } from "@/lib/constants";
import { StatusControl } from "./status-control";

export const metadata = { title: "Tableau de bord — Le bazar de Laura" };

export default async function AdminDashboard(props: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await props.searchParams;
  const books = await listAdminBooks(q);

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">Tableau de bord</h1>
          <p className="text-sm text-muted">{books.length} livre{books.length > 1 ? "s" : ""} en stock</p>
        </div>
        <Link
          href="/admin/scan"
          className="rounded-full bg-accent px-5 py-2.5 font-medium text-white transition hover:bg-accent-dark"
        >
          + Ajouter un livre
        </Link>
      </header>

      <form className="mb-6">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Rechercher (titre, auteur, ISBN)…"
          className="w-full rounded-md border border-line bg-surface px-3 py-2 placeholder:text-muted/70"
        />
      </form>

      {books.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-8 text-center text-muted">
          Aucun livre. Commencez par en ajouter un.
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface/50">
          {books.map((b) => (
            <li key={b.id} className="flex items-center gap-3 px-3 py-3">
              <div className="h-16 w-11 shrink-0 overflow-hidden rounded bg-surface-2 ring-1 ring-line">
                {b.cover_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.cover_url} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/admin/livre/${b.id}`} className="block truncate font-serif font-medium hover:text-accent">
                  {b.title}
                </Link>
                <div className="truncate text-sm text-muted">
                  {b.authors.join(", ") || "—"} · {categoryLabel(b.category)} · {formatPrice(b.price)}
                  {b.status !== "disponible" && (
                    <span className="text-accent"> · {statusLabel(b.status)}</span>
                  )}
                </div>
              </div>
              <StatusControl id={b.id} status={b.status} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
