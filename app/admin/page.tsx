import Link from "next/link";
import { listAdminBooks } from "@/lib/books";
import { formatPrice, categoryLabel } from "@/lib/constants";
import { StatusControl } from "./status-control";

export const metadata = { title: "Tableau de bord — Le bazar de Laura" };

export default async function AdminDashboard(props: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await props.searchParams;
  const books = await listAdminBooks(q);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Tableau de bord</h1>
          <p className="text-sm text-neutral-500">{books.length} livre(s)</p>
        </div>
        <Link href="/admin/scan" className="rounded bg-neutral-900 px-4 py-2 text-white">
          + Ajouter un livre
        </Link>
      </header>

      <form className="mb-6">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Rechercher (titre, auteur, ISBN)…"
          className="w-full rounded border border-neutral-300 px-3 py-2"
        />
      </form>

      {books.length === 0 ? (
        <p className="text-neutral-500">Aucun livre. Commence par en ajouter un.</p>
      ) : (
        <ul className="divide-y divide-neutral-200">
          {books.map((b) => (
            <li key={b.id} className="flex items-center gap-3 py-3">
              <div className="h-16 w-12 shrink-0 overflow-hidden rounded bg-neutral-100">
                {b.cover_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.cover_url} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/admin/livre/${b.id}`} className="block truncate font-medium hover:underline">
                  {b.title}
                </Link>
                <div className="truncate text-sm text-neutral-500">
                  {b.authors.join(", ") || "—"} · {categoryLabel(b.category)} · {formatPrice(b.price)}
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
