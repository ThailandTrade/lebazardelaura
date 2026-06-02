import Link from "next/link";
import { auth } from "@/auth";
import { query } from "@/lib/db";
import { logout } from "./actions";

export const metadata = { title: "Tableau de bord — Le bazar de Laura" };

type StatusCount = { status: string; n: string };

export default async function AdminDashboard() {
  const session = await auth();

  const counts = await query<StatusCount>(
    "select status::text as status, count(*)::text as n from books group by status",
  );
  const total = counts.reduce((sum, c) => sum + Number(c.n), 0);
  const byStatus = Object.fromEntries(counts.map((c) => [c.status, Number(c.n)]));

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tableau de bord</h1>
          <p className="text-sm text-neutral-500">{session?.user?.email}</p>
        </div>
        <form action={logout}>
          <button className="text-sm text-neutral-500 underline">Se déconnecter</button>
        </form>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total" value={total} />
        <Stat label="Disponibles" value={byStatus["disponible"] ?? 0} />
        <Stat label="Réservés" value={byStatus["reserve"] ?? 0} />
        <Stat label="Vendus" value={byStatus["vendu"] ?? 0} />
      </section>

      <Link
        href="/admin/scan"
        className="inline-block rounded bg-neutral-900 px-5 py-3 text-white"
      >
        + Scanner un livre
      </Link>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-neutral-200 p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-sm text-neutral-500">{label}</div>
    </div>
  );
}
