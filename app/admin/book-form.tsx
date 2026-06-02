"use client";

import { useState, useTransition } from "react";
import { CATEGORIES, CONDITIONS, STATUSES, QUICK_PRICES } from "@/lib/constants";
import type { IsbnLookupResult } from "@/lib/isbn";

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
  condition: string;
  status: string;
  price: string;
  notes: string;
  source: string;
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
  notes: string | null;
  source: string | null;
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
    condition: init.condition ?? "bon",
    status: init.status ?? "disponible",
    price: init.price != null ? String(init.price) : "",
    notes: init.notes ?? "",
    source: init.source ?? "manuel",
  };
}

const input = "w-full rounded-md border border-line bg-surface px-3 py-2 text-base";

export function BookForm({
  action,
  initial = {},
  submitLabel = "Enregistrer",
}: {
  action: (formData: FormData) => void;
  initial?: BookFormInitial;
  submitLabel?: string;
}) {
  const [s, setS] = useState<FormState>(() => toState(initial));
  const [lookupMsg, setLookupMsg] = useState<string | null>(null);
  const [lookingUp, startLookup] = useTransition();
  const [uploading, setUploading] = useState(false);

  const set = (k: keyof FormState, v: string) => setS((prev) => ({ ...prev, [k]: v }));

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
          <label className="cursor-pointer rounded-md border border-line bg-surface px-3 py-2 text-sm transition hover:bg-surface-2">
            {uploading ? "Envoi…" : "Prendre / choisir une photo"}
            <input
              type="file"
              accept="image/*"
              capture="environment"
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

      {/* Prix */}
      <Field label="Prix (฿) *">
        <input
          name="price"
          required
          inputMode="decimal"
          value={s.price}
          onChange={(e) => set("price", e.target.value)}
          className={input}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {QUICK_PRICES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => set("price", String(p))}
              className={`rounded-full border px-4 py-1 text-sm transition ${
                s.price === String(p) ? "border-accent bg-accent text-white" : "border-line hover:border-accent"
              }`}
            >
              {p}฿
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Catégorie">
          <select name="category" value={s.category} onChange={(e) => set("category", e.target.value)} className={input}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="État">
          <select name="condition" value={s.condition} onChange={(e) => set("condition", e.target.value)} className={input}>
            {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="Statut">
          <select name="status" value={s.status} onChange={(e) => set("status", e.target.value)} className={input}>
            {STATUSES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Description">
        <textarea name="description" rows={4} value={s.description} onChange={(e) => set("description", e.target.value)} className={input} />
      </Field>
      <Field label="Notes internes (jamais visibles publiquement)">
        <textarea name="notes" rows={2} value={s.notes} onChange={(e) => set("notes", e.target.value)} className={input} />
      </Field>

      <button type="submit" className="rounded-md bg-accent px-5 py-3 text-base font-medium text-white transition hover:bg-accent-dark">
        {submitLabel}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-neutral-700">{label}</span>
      {children}
    </label>
  );
}
