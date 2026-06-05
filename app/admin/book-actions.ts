"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createBook,
  updateBook,
  setStatus,
  adjustQuantity,
  deleteBook,
  isValidCategory,
  isValidCondition,
  isValidStatus,
  type BookInput,
} from "@/lib/books";
import { normalizeIsbn } from "@/lib/isbn";
import { localizeCover } from "@/lib/images";
import type { BookCondition, BookStatus } from "@/lib/constants";

function str(form: FormData, key: string): string | null {
  const v = form.get(key);
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
}

// Métadonnées partagées par tous les exemplaires d'un titre (hors état/prix/dispo/quantité).
type BookBase = Omit<BookInput, "condition" | "price" | "status" | "quantity">;

function parseBookBase(form: FormData): BookBase {
  const title = str(form, "title");
  if (!title) throw new Error("Titre obligatoire");

  const authors = (str(form, "authors") ?? "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);

  const pageRaw = str(form, "page_count");
  const page_count = pageRaw && Number.isFinite(Number(pageRaw)) ? parseInt(pageRaw, 10) : null;

  const isbnRaw = str(form, "isbn");
  const category = str(form, "category") ?? "autre";

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
    notes: str(form, "notes"),
    source: str(form, "source"),
  };
}

type VariantInput = { condition: BookCondition; price: number; status: BookStatus; quantity: number };

// Lit la liste d'exemplaires (champ caché JSON `variants`) ; fusionne les lignes
// identiques (même état + prix + dispo) en cumulant les quantités.
function parseVariants(form: FormData): VariantInput[] {
  const raw = form.get("variants");
  let arr: unknown[] = [];
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) arr = parsed;
    } catch {
      arr = [];
    }
  }
  if (arr.length === 0) {
    // Repli : anciens champs uniques (compat).
    arr = [{ condition: form.get("condition"), price: form.get("price"), status: form.get("status"), quantity: form.get("quantity") }];
  }

  const parsed = arr.map((v) => {
    const o = (v ?? {}) as Record<string, unknown>;
    const priceRaw = Number(o.price);
    const price = Number.isFinite(priceRaw) && priceRaw >= 0 ? Math.round(priceRaw * 100) / 100 : 0;
    const qtyRaw = Number(o.quantity);
    const quantity = Number.isFinite(qtyRaw) && qtyRaw >= 0 ? Math.floor(qtyRaw) : 1;
    const condition = String(o.condition ?? "");
    const status = String(o.status ?? "");
    return {
      condition: isValidCondition(condition) ? condition : "bon",
      price,
      status: isValidStatus(status) ? status : "disponible",
      quantity,
    } as VariantInput;
  });

  // Fusionne les exemplaires identiques (même état + prix + dispo).
  const merged = new Map<string, VariantInput>();
  for (const v of parsed) {
    const key = `${v.condition}|${v.price}|${v.status}`;
    const ex = merged.get(key);
    if (ex) ex.quantity += v.quantity;
    else merged.set(key, { ...v });
  }
  const out = [...merged.values()];
  return out.length > 0 ? out : [{ condition: "bon", price: 0, status: "disponible", quantity: 1 }];
}

export async function createBookAction(form: FormData): Promise<void> {
  const base = parseBookBase(form);
  base.cover_url = await localizeCover(base.cover_url); // rapatrie + optimise la couverture (une fois)
  const variants = parseVariants(form);
  for (const v of variants) {
    await createBook({ ...base, condition: v.condition, price: v.price, status: v.status, quantity: v.quantity });
  }
  revalidatePath("/admin");
  revalidatePath("/catalogue");
  redirect("/admin");
}

export async function updateBookAction(id: string, form: FormData): Promise<void> {
  const base = parseBookBase(form);
  base.cover_url = await localizeCover(base.cover_url); // rapatrie + optimise si externe (une fois)
  const variants = parseVariants(form);
  // 1er exemplaire → met à jour la fiche ouverte ; états ajoutés → nouvelles lignes sœurs.
  const [first, ...rest] = variants;
  await updateBook(id, { ...base, condition: first.condition, price: first.price, status: first.status, quantity: first.quantity });
  for (const v of rest) {
    await createBook({ ...base, condition: v.condition, price: v.price, status: v.status, quantity: v.quantity });
  }
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

export async function adjustQuantityAction(id: string, delta: number): Promise<void> {
  await adjustQuantity(id, delta);
  revalidatePath("/admin");
  revalidatePath("/catalogue");
}

export async function deleteBookAction(id: string): Promise<void> {
  await deleteBook(id);
  revalidatePath("/admin");
  revalidatePath("/catalogue");
  redirect("/admin");
}
