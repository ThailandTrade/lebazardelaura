import Link from "next/link";
import { BookForm } from "../book-form";
import { createBookAction } from "../book-actions";

export const metadata = { title: "Ajouter un livre — Le bazar de Laura" };

export default function AddBookPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link href="/admin" className="text-sm text-muted underline-offset-4 hover:underline">
        ← Tableau de bord
      </Link>
      <h1 className="mb-6 mt-2 font-serif text-3xl tracking-tight">Ajouter un livre</h1>
      <BookForm action={createBookAction} submitLabel="Ajouter au stock" />
    </main>
  );
}
