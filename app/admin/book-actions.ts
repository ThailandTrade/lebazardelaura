"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createBook,
  updateBook,
  setStatus,
  deleteBook,
  isValidCategory,
  isValidCondition,
  isValidStatus,
  type BookInput,
} from "@/lib/books";
import { normalizeIsbn } from "@/lib/isbn";
import type { BookStatus } from "@/lib/constants";

function str(form: FormData, key: string): string | null {
  const v = form.get(key);
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
}

function parseBookInput(form: FormData): BookInput {
  const title = str(form, "title");
  if (!title) throw new Error("Titre obligatoire");

  const priceRaw = Number(form.get("price"));
  const price = Number.isFinite(priceRaw) && priceRaw >= 0 ? Math.round(priceRaw * 100) / 100 : 0;

  const authors = (str(form, "authors") ?? "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);

  const pageRaw = str(form, "page_count");
  const page_count = pageRaw && Number.isFinite(Number(pageRaw)) ? parseInt(pageRaw, 10) : null;

  const isbnRaw = str(form, "isbn");
  const category = str(form, "category") ?? "autre";
  const condition = str(form, "condition") ?? "bon";
  const status = str(form, "status") ?? "disponible";

  return {
    isbn: isbnRaw ? (normalizeIsbn(isbnRaw) ?? isbnRaw) : null,
    title,
    subtitle: str(form, "subtitle"),
    authors,
    publisher: str(form, "publisher"),
    published_date: str(form, "published_date"),
    description: str(form, "description"),
    cover_url: str(form, "cover_url"),
    language: str(form, "language") ?? "fr",
    page_count,
    category: isValidCategory(category) ? category : "autre",
    condition: isValidCondition(condition) ? condition : "bon",
    price,
    status: isValidStatus(status) ? status : "disponible",
    notes: str(form, "notes"),
    source: str(form, "source"),
  };
}

export async function createBookAction(form: FormData): Promise<void> {
  const input = parseBookInput(form);
  await createBook(input);
  revalidatePath("/admin");
  revalidatePath("/catalogue");
  redirect("/admin");
}

export async function updateBookAction(id: string, form: FormData): Promise<void> {
  const input = parseBookInput(form);
  await updateBook(id, input);
  revalidatePath("/admin");
  revalidatePath("/catalogue");
  revalidatePath(`/livre/${id}`);
  redirect("/admin");
}

export async function quickStatusAction(id: string, status: BookStatus): Promise<void> {
  await setStatus(id, status);
  revalidatePath("/admin");
  revalidatePath("/catalogue");
}

export async function deleteBookAction(id: string): Promise<void> {
  await deleteBook(id);
  revalidatePath("/admin");
  revalidatePath("/catalogue");
  redirect("/admin");
}
