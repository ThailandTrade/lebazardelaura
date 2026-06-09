"use client";

import { useState, useTransition } from "react";
import { CATEGORIES, CONDITIONS, STATUSES, QUICK_PRICES } from "@/lib/constants";
import type { IsbnLookupResult } from "@/lib/isbn";
import { CoverPicker } from "./cover-picker";

// Un exemplaire (ou groupe d'exemplaires identiques) : son état, son prix, sa
// disponibilité et le nombre d'exemplaires dans cet état. `id` = ligne books
// existante (édition) ; absent = nouvel état à créer.
type Variant = {
  id?: string;
  condition: string;
  price: string;
  status: string;
  quantity: string;
  entry_date?: string | null; // affichage seul (lecture)
  exit_date?: string | null;
};

type FormState = {
  isbn: string;
  title: string;
  subtitle: string;
  authors: string;
  publisher: string;
  published_date: string;
  description: string;
  language: string;
  page_count: string;
  cover_url: string;
  category: string;
  notes: string;
  source: string;
  variants: Variant[];
};

export type BookFormInitial = Partial<{
  isbn: string | null;
  title: string;
  subtitle: string | null;
  authors: string[];
  publisher: string | null;
  published_date: string | null;
  description: string | null;
  language: string | null;
  page_count: number | null;
  cover_url: string | null;
  category: string;
  condition: string;
  status: string;
  price: string | number;
  quantity: number | string;
  notes: string | null;
  source: string | null;
  // Édition d'un titre regroupé : tous ses états existants (avec leur id).
  variants: Array<{
    id?: string;
    condition: string;
    price: string | number;
    status: string;
    quantity: number | string;
    entry_date?: string | null;
    exit_date?: string | null;
  }>;
}>;

function toState(init: BookFormInitial): FormState {
  return {
    isbn: init.isbn ?? "",
    title: init.title ?? "",
    subtitle: init.subtitle ?? "",
    authors: (init.authors ?? []).join(", "),
    publisher: init.publisher ?? "",
    published_date: init.published_date ?? "",
    description: init.description ?? "",
    language: init.language ?? "fr",
    page_count: init.page_count != null ? String(init.page_count) : "",
    cover_url: init.cover_url ?? "",
    category: init.category ?? "autre",
    notes: init.notes ?? "",
    source: init.source ?? "manuel",
    variants:
      init.variants && init.variants.length > 0
        ? init.variants.map((v) => ({
            id: v.id,
            condition: v.condition ?? "bon",
            price: v.price != null ? String(v.price) : "",
            status: v.status ?? "disponible",
            quantity: v.quantity != null ? String(v.quantity) : "1",
            entry_date: v.entry_date ?? null,
            exit_date: v.exit_date ?? null,
          }))
        : [
            {
              condition: init.condition ?? "bon",
              price: init.price != null ? String(init.price) : "",
              status: init.status ?? "disponible",
              quantity: init.quantity != null ? String(init.quantity) : "1",
            },
          ],
  };
}

const input = "w-full rounded-md border border-line bg-surface px-3 py-2 text-base";

export function BookForm({
  action,
  initial = {},
  submitLabel = "Enregistrer",
  sellAction,
}: {
  action: (formData: FormData) => void;
  initial?: BookFormInitial;
  submitLabel?: string;
  // Si fourni (flux de scan), affiche un bouton « Vendu » qui enregistre le livre comme vendu.
  sellAction?: (formData: FormData) => void;
}) {
  const [s, setS] = useState<FormState>(() => toState(initial));
  const [lookupMsg, setLookupMsg] = useState<string | null>(null);
  const [lookingUp, startLookup] = useTransition();
  const [uploading, setUploading] = useState(false);

  const set = (k: keyof FormState, v: string) => setS((prev) => ({ ...prev, [k]: v }));

  const setVariant = (i: number, k: keyof Variant, v: string) =>
    setS((prev) => ({
      ...prev,
      variants: prev.variants.map((x, j) => (j === i ? { ...x, [k]: v } : x)),
    }));

  const addVariant = () =>
    setS((prev) => {
      const last = prev.variants[prev.variants.length - 1];
      // Nouvel exemplaire (sans id = nouvelle ligne) pré-rempli depuis le précédent.
      return { ...prev, variants: [...prev.variants, { ...last, id: undefined, quantity: "1" }] };
    });

  const removeVariant = (i: number) =>
    setS((prev) =>
      prev.variants.length <= 1 ? prev : { ...prev, variants: prev.variants.filter((_, j) => j !== i) },
    );

  function lookup() {
    const isbn = s.isbn.trim();
    if (!isbn) return;
    setLookupMsg(null);
    startLookup(async () => {
      try {
        const res = await fetch(`/api/isbn/${encodeURIComponent(isbn)}`);
        const result: IsbnLookupResult = await res.json();
        if (!result.found || !result.data) {
          setLookupMsg("Rien trouvé — remplis les champs à la main.");
          set("source", "manuel");
          return;
        }
        const d = result.data;
        setS((prev) => ({
          ...prev,
          title: d.title ?? prev.title,
          subtitle: d.subtitle ?? prev.subtitle,
          authors: d.authors.length ? d.authors.join(", ") : prev.authors,
          publisher: d.publisher ?? prev.publisher,
          published_date: d.published_date ?? prev.published_date,
          description: d.description ?? prev.description,
          language: d.language ?? prev.language,
          page_count: d.page_count != null ? String(d.page_count) : prev.page_count,
          cover_url: d.cover_url ?? prev.cover_url,
          category: d.category ?? prev.category,
          source: result.source ?? "manuel",
        }));
        const sourceLabel =
          result.source === "google_books" ? "Google Books" : result.source === "bnf" ? "BnF" : "Open Library";
        setLookupMsg(`Infos récupérées (${sourceLabel}).`);
      } catch {
        setLookupMsg("Erreur réseau pendant la recherche.");
      }
    });
  }

  async function onCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (res.ok && json.url) set("cover_url", json.url);
      else setLookupMsg(json.error ?? "Échec de l'upload.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      {/* Recherche ISBN */}
      <div className="rounded-lg border border-line bg-surface-2/60 p-4">
        <label className="mb-1 block text-sm font-medium">ISBN (code-barres)</label>
        <div className="flex gap-2">
          <input
            name="isbn"
            value={s.isbn}
            onChange={(e) => set("isbn", e.target.value)}
            inputMode="numeric"
            placeholder="978…"
            className={input}
          />
          <button
            type="button"
            onClick={lookup}
            disabled={lookingUp || !s.isbn.trim()}
            className="shrink-0 rounded-md bg-foreground px-4 py-2 text-white transition hover:bg-accent disabled:opacity-50"
          >
            {lookingUp ? "…" : "Rechercher"}
          </button>
        </div>
        {lookupMsg && <p className="mt-2 text-sm text-neutral-600">{lookupMsg}</p>}
      </div>

      {/* Couverture */}
      <div className="flex gap-4">
        <div className="h-40 w-28 shrink-0 overflow-hidden rounded-md border border-line bg-surface-2">
          {s.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.cover_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted">
              Pas de couverture
            </div>
          )}
        </div>
        <div className="flex flex-col justify-end gap-2">
          <label className="cursor-pointer rounded-md border border-line bg-surface px-3 py-2 text-center text-sm transition hover:bg-surface-2">
            {uploading ? "Envoi…" : "Prendre une photo"}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onCoverChange}
              className="hidden"
            />
          </label>
          <label className="cursor-pointer rounded-md border border-line bg-surface px-3 py-2 text-center text-sm transition hover:bg-surface-2">
            {uploading ? "Envoi…" : "Choisir une image"}
            <input
              type="file"
              accept="image/*"
              onChange={onCoverChange}
              className="hidden"
            />
          </label>
          {s.cover_url && (
            <button
              type="button"
              onClick={() => set("cover_url", "")}
              className="text-left text-xs text-neutral-500 underline"
            >
              Retirer la couverture
            </button>
          )}
        </div>
      </div>
      <CoverPicker
        isbn={s.isbn}
        title={s.title}
        author={s.authors.split(",")[0]?.trim() ?? ""}
        onPick={(url) => set("cover_url", url)}
      />

      <input type="hidden" name="cover_url" value={s.cover_url} />
      <input type="hidden" name="source" value={s.source} />

      <Field label="Titre *">
        <input name="title" required value={s.title} onChange={(e) => set("title", e.target.value)} className={input} />
      </Field>
      <Field label="Sous-titre">
        <input name="subtitle" value={s.subtitle} onChange={(e) => set("subtitle", e.target.value)} className={input} />
      </Field>
      <Field label="Auteur(s) — séparés par des virgules">
        <input name="authors" value={s.authors} onChange={(e) => set("authors", e.target.value)} className={input} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Éditeur">
          <input name="publisher" value={s.publisher} onChange={(e) => set("publisher", e.target.value)} className={input} />
        </Field>
        <Field label="Date de parution">
          <input name="published_date" value={s.published_date} onChange={(e) => set("published_date", e.target.value)} className={input} />
        </Field>
        <Field label="Langue">
          <input name="language" value={s.language} onChange={(e) => set("language", e.target.value)} className={input} />
        </Field>
        <Field label="Pages">
          <input name="page_count" inputMode="numeric" value={s.page_count} onChange={(e) => set("page_count", e.target.value)} className={input} />
        </Field>
      </div>

      <Field label="Catégorie">
        <select name="category" value={s.category} onChange={(e) => set("category", e.target.value)} className={input}>
          {[...CATEGORIES]
            .sort((a, b) => a.label.localeCompare(b.label, "fr"))
            .map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </Field>

      {/* Exemplaires : un état / prix / disponibilité / quantité par ligne.
          Même état → garde une seule ligne avec la bonne quantité. */}
      <div className="rounded-lg border border-line bg-surface-2/40 p-4">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-medium text-neutral-700">
            Exemplaires{s.variants.length > 1 ? ` (${s.variants.length} états)` : ""}
          </span>
          <button
            type="button"
            onClick={addVariant}
            className="rounded-full border border-line px-3 py-1 text-sm transition hover:border-accent"
          >
            + Ajouter un état
          </button>
        </div>
        <p className="mb-3 text-xs text-muted">
          Plusieurs exemplaires dans le même état ? Une seule ligne, ajuste la quantité. Un état différent
          (et/ou un autre prix) ? Ajoute une ligne.
        </p>

        <div className="flex flex-col gap-4">
          {s.variants.map((v, i) => (
            <div key={i} className="rounded-md border border-line bg-surface p-3">
              {s.variants.length > 1 && (
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted">Exemplaire {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeVariant(i)}
                    className="text-xs text-red-600 underline underline-offset-2"
                  >
                    Retirer
                  </button>
                </div>
              )}

              <Field label="Prix (฿) *">
                <input
                  inputMode="decimal"
                  value={v.price}
                  onChange={(e) => setVariant(i, "price", e.target.value)}
                  className={input}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {QUICK_PRICES.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setVariant(i, "price", String(p))}
                      className={`rounded-full border px-4 py-1 text-sm transition ${
                        v.price === String(p) ? "border-accent bg-accent text-white" : "border-line hover:border-accent"
                      }`}
                    >
                      {p}฿
                    </button>
                  ))}
                </div>
              </Field>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="État">
                  <select value={v.condition} onChange={(e) => setVariant(i, "condition", e.target.value)} className={input}>
                    {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </Field>
                <Field label="Disponibilité">
                  <select value={v.status} onChange={(e) => setVariant(i, "status", e.target.value)} className={input}>
                    {STATUSES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </Field>
                <Field label="Quantité">
                  <input
                    inputMode="numeric"
                    value={v.quantity}
                    onChange={(e) => setVariant(i, "quantity", e.target.value)}
                    className={input}
                  />
                </Field>
              </div>

              {(v.entry_date || v.exit_date) && (
                <p className="mt-2 text-xs text-muted">
                  {v.entry_date ? `Entré le ${frDate(v.entry_date)}` : ""}
                  {v.exit_date ? `${v.entry_date ? " · " : ""}Vendu le ${frDate(v.exit_date)}` : ""}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
      <input
        type="hidden"
        name="variants"
        value={JSON.stringify(
          s.variants.map((v) => ({
            id: v.id,
            condition: v.condition,
            price: v.price,
            status: v.status,
            quantity: v.quantity,
          })),
        )}
      />

      <Field label="Description">
        <textarea name="description" rows={4} value={s.description} onChange={(e) => set("description", e.target.value)} className={input} />
      </Field>
      <Field label="Notes internes (jamais visibles publiquement)">
        <textarea name="notes" rows={2} value={s.notes} onChange={(e) => set("notes", e.target.value)} className={input} />
      </Field>

      <div className="flex flex-col gap-2">
        <button type="submit" className="rounded-md bg-accent px-5 py-3 text-base font-medium text-white transition hover:bg-accent-dark">
          {submitLabel}
        </button>
        {sellAction && (
          <button
            type="submit"
            formAction={sellAction}
            className="rounded-md border-2 border-foreground bg-surface px-5 py-3 text-base font-medium text-foreground transition hover:bg-surface-2"
          >
            Vendu (sortie directe)
          </button>
        )}
      </div>
    </form>
  );
}

function frDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-neutral-700">{label}</span>
      {children}
    </label>
  );
}
