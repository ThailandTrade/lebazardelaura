"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { BarcodeScanner } from "./barcode-scanner";
import { BookForm, type BookFormInitial } from "../book-form";
import { statusLabel } from "@/lib/constants";

type Mode = "scan" | "manual" | "loading" | "dup" | "form";
type Existing = { id: string; title: string; status: string };
type ApiResult = {
  isbn: string;
  existing: Existing | null;
  lookup: { source: string | null; data: Record<string, unknown> | null };
};

function feedback() {
  if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(70);
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.05;
    osc.start();
    setTimeout(() => { osc.stop(); ctx.close(); }, 110);
  } catch { /* son indispo : pas grave */ }
}

function initialFromLookup(isbn: string | undefined, lookup: ApiResult["lookup"] | null): BookFormInitial {
  const d = lookup?.data as
    | null
    | {
        title?: string; subtitle?: string | null; authors?: string[]; publisher?: string | null;
        published_date?: string | null; description?: string | null; language?: string | null;
        page_count?: number | null; cover_url?: string | null;
      };
  return {
    isbn: isbn ?? "",
    title: d?.title ?? "",
    subtitle: d?.subtitle ?? "",
    authors: d?.authors ?? [],
    publisher: d?.publisher ?? "",
    published_date: d?.published_date ?? "",
    description: d?.description ?? "",
    language: d?.language ?? "fr",
    page_count: d?.page_count ?? null,
    cover_url: d?.cover_url ?? "",
    source: lookup?.source ?? "manuel",
  };
}

export function AddBookFlow({ createAction }: { createAction: (formData: FormData) => void }) {
  const [mode, setMode] = useState<Mode>("scan");
  const [initial, setInitial] = useState<BookFormInitial>({});
  const [dup, setDup] = useState<Existing | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const lastResult = useRef<ApiResult | null>(null);

  const handleCode = useCallback(async (code: string) => {
    feedback();
    setMode("loading");
    setNote(null);
    try {
      const res = await fetch(`/api/books/by-isbn/${encodeURIComponent(code)}`);
      if (!res.ok) {
        setInitial(initialFromLookup(code, null));
        setNote("ISBN non reconnu — complète les champs à la main.");
        setMode("form");
        return;
      }
      const data: ApiResult = await res.json();
      lastResult.current = data;
      if (data.existing) {
        setDup(data.existing);
        setMode("dup");
        return;
      }
      if (!data.lookup.data) setNote("Rien trouvé pour cet ISBN — complète à la main.");
      setInitial(initialFromLookup(data.isbn, data.lookup));
      setMode("form");
    } catch {
      setInitial(initialFromLookup(code, null));
      setNote("Réseau indisponible — saisie manuelle.");
      setMode("form");
    }
  }, []);

  function addAnyway() {
    const r = lastResult.current;
    setInitial(initialFromLookup(r?.isbn, r?.lookup ?? null));
    setMode("form");
  }

  function emptyForm() {
    setInitial(initialFromLookup(undefined, null));
    setMode("form");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-5">
      {mode === "scan" && (
        <>
          <h1 className="mb-4 font-serif text-2xl">Scanner un livre</h1>
          <BarcodeScanner onDetected={handleCode} />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button onClick={() => setMode("manual")} className="rounded-lg border border-line bg-surface py-3 text-sm font-medium">
              Saisir l&apos;ISBN
            </button>
            <button onClick={emptyForm} className="rounded-lg border border-line bg-surface py-3 text-sm font-medium">
              Sans ISBN
            </button>
          </div>
        </>
      )}

      {mode === "manual" && <ManualEntry onSubmit={handleCode} onBack={() => setMode("scan")} />}

      {mode === "loading" && (
        <div className="py-20 text-center text-muted">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
          Recherche…
        </div>
      )}

      {mode === "dup" && dup && (
        <div className="py-6">
          <h1 className="mb-4 font-serif text-2xl">Déjà en stock</h1>
          <div className="rounded-xl border border-line bg-surface-2/60 p-4">
            <p className="font-serif text-lg">« {dup.title} »</p>
            <p className="mt-1 text-sm text-muted">Statut : {statusLabel(dup.status)}</p>
            <div className="mt-4 flex flex-col gap-2">
              <Link href={`/admin/livre/${dup.id}`} className="rounded-lg bg-accent px-5 py-3 text-center font-medium text-white">
                Modifier ce livre
              </Link>
              <button onClick={addAnyway} className="rounded-lg border border-line px-5 py-2.5 text-sm">
                Ajouter quand même un autre exemplaire
              </button>
              <button onClick={() => setMode("scan")} className="text-sm text-muted underline-offset-2 hover:underline">
                ← Scanner un autre
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === "form" && (
        <div className="py-2">
          <button onClick={() => setMode("scan")} className="mb-3 text-sm text-muted underline-offset-2 hover:underline">
            ← Scanner un autre
          </button>
          {note && (
            <p className="mb-4 rounded-lg border border-line bg-surface-2/60 px-3 py-2 text-sm text-muted">{note}</p>
          )}
          <BookForm action={createAction} initial={initial} submitLabel="Ajouter au stock" />
        </div>
      )}
    </div>
  );
}

function ManualEntry({ onSubmit, onBack }: { onSubmit: (code: string) => void; onBack: () => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="py-4">
      <h1 className="mb-4 font-serif text-2xl">Saisir l&apos;ISBN</h1>
      <input
        autoFocus
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="978…"
        className="w-full rounded-md border border-line bg-surface px-3 py-3 text-lg"
      />
      <div className="mt-3 flex gap-3">
        <button onClick={onBack} className="rounded-lg border border-line px-5 py-3 text-sm">
          ← Caméra
        </button>
        <button
          onClick={() => value.trim() && onSubmit(value.trim())}
          disabled={!value.trim()}
          className="flex-1 rounded-lg bg-accent px-5 py-3 font-medium text-white disabled:opacity-50"
        >
          Rechercher
        </button>
      </div>
    </div>
  );
}
