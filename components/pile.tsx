"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";

// « Pile à lire » : une sélection de livres côté visiteur, façon panier mais sans
// paiement. Stockée dans le navigateur (localStorage), pas de compte.

export type PileItem = {
  id: string; // id de l'exemplaire (ligne books) choisi
  title: string;
  conditionLabel: string;
  priceLabel: string;
  cover_url: string | null;
};

type PileCtx = {
  items: PileItem[];
  ready: boolean;
  add: (item: PileItem) => void;
  remove: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
};

const Ctx = createContext<PileCtx | null>(null);
const KEY = "bazar-pile-a-lire";

export function PileProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<PileItem[]>([]);
  const [ready, setReady] = useState(false);

  // Chargement initial depuis le navigateur.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch {
      /* localStorage indispo : on reste sur une pile vide */
    }
    setReady(true);
  }, []);

  // Persistance + synchro entre onglets.
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* quota / mode privé : pas grave */
    }
  }, [items, ready]);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== KEY) return;
      try {
        setItems(e.newValue ? JSON.parse(e.newValue) : []);
      } catch {
        /* ignore */
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo<PileCtx>(
    () => ({
      items,
      ready,
      add: (item) => setItems((prev) => (prev.some((p) => p.id === item.id) ? prev : [...prev, item])),
      remove: (id) => setItems((prev) => prev.filter((p) => p.id !== id)),
      clear: () => setItems([]),
      has: (id) => items.some((p) => p.id === id),
    }),
    [items, ready],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePile(): PileCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePile doit être utilisé dans <PileProvider>");
  return c;
}

// Bouton de l'en-tête (haut à droite), façon panier avec compteur.
export function PileNavButton() {
  const { items, ready } = usePile();
  const n = items.length;
  return (
    <Link
      href="/ma-pile"
      className={`relative inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[15px] transition ${
        ready && n > 0 ? "border-accent bg-accent/10" : "border-line bg-surface hover:border-accent"
      }`}
    >
      Ma pile à lire
      {ready && n > 0 && (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-medium text-white">
          {n}
        </span>
      )}
    </Link>
  );
}

// Bouton d'ajout (sur la fiche livre).
export function AddToPileButton({ item }: { item: PileItem }) {
  const { add, remove, has, ready } = usePile();
  const inPile = ready && has(item.id);
  return (
    <button
      type="button"
      onClick={() => (inPile ? remove(item.id) : add(item))}
      className={`rounded-lg px-5 py-3 text-center font-medium transition ${
        inPile
          ? "border border-accent bg-accent/10 text-accent"
          : "bg-accent text-white hover:bg-accent-dark"
      }`}
    >
      {inPile ? "✓ Dans ma pile à lire" : "Ajouter à ma pile à lire"}
    </button>
  );
}

// Corps de la page /ma-pile (récapitulatif de la sélection).
export function PilePage() {
  const { items, remove, clear, ready } = usePile();
  const [copied, setCopied] = useState(false);

  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  const lineId = process.env.NEXT_PUBLIC_LINE_ID;

  const lines = items.map((i) => `• « ${i.title} » (${i.conditionLabel}, ${i.priceLabel})`).join("\n");
  const message =
    items.length > 0
      ? `Coucou Laura ! J'aimerais bien ces livres :\n${lines}\nIls sont encore dispos ?`
      : "";

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard indispo */
    }
  }

  if (!ready) {
    return <p className="mt-8 text-muted">Un instant…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-dashed border-line p-8 text-center text-muted">
        <p>Ta pile à lire est vide pour l&apos;instant.</p>
        <Link
          href="/catalogue"
          className="mt-4 inline-block rounded-full bg-accent px-6 py-2.5 font-medium text-white transition hover:bg-accent-dark"
        >
          Voir ma bibliothèque
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface/50">
        {items.map((i) => (
          <li key={i.id} className="flex items-center gap-3 px-3 py-3">
            <Link href={`/livre/${i.id}`} className="h-16 w-11 shrink-0 overflow-hidden rounded bg-surface-2 ring-1 ring-line">
              {i.cover_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={i.cover_url} alt="" className="h-full w-full object-cover" />
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/livre/${i.id}`} className="block truncate font-serif font-medium hover:text-accent">
                {i.title}
              </Link>
              <p className="text-sm text-muted">
                {i.conditionLabel} · {i.priceLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={() => remove(i.id)}
              className="shrink-0 text-sm text-muted underline-offset-2 hover:text-red-600 hover:underline"
            >
              Retirer
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-6 rounded-xl border border-line bg-surface-2/60 p-4 sm:p-5">
        <p className="mb-3 font-serif text-lg">
          {items.length} livre{items.length > 1 ? "s" : ""} dans ta pile. On en parle ?
        </p>
        <div className="flex flex-col gap-2.5">
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-[#25D366] px-5 py-3 text-center font-medium text-white transition hover:brightness-95"
            >
              Envoyer ma pile sur WhatsApp
            </a>
          )}
          {lineId && (
            <a
              href={`https://line.me/R/ti/p/${lineId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-[#06C755] px-5 py-3 text-center font-medium text-white transition hover:brightness-95"
            >
              M&apos;écrire sur Line
            </a>
          )}
          <button
            type="button"
            onClick={copyMessage}
            className="rounded-lg border border-line px-5 py-2.5 text-sm transition hover:bg-surface"
          >
            {copied ? "Liste copiée ✓" : "Copier ma sélection"}
          </button>
          <button
            type="button"
            onClick={clear}
            className="self-start text-sm text-muted underline-offset-2 hover:text-red-600 hover:underline"
          >
            Vider ma pile
          </button>
        </div>

        {(whatsapp || lineId) && (
          <div className="mt-5 border-t border-line pt-4">
            <p className="mb-3 text-sm text-muted">Ou scanne pour m&apos;ajouter :</p>
            <div className="flex flex-wrap gap-6">
              {whatsapp && (
                <figure className="text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/contact/whatsapp.png"
                    alt="QR WhatsApp de Laura"
                    className="h-36 w-36 rounded-lg border border-line bg-white p-1.5"
                  />
                  <figcaption className="mt-1.5 text-xs text-muted">WhatsApp</figcaption>
                </figure>
              )}
              {lineId && (
                <figure className="text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/contact/line.png"
                    alt="QR Line de Laura"
                    className="h-36 w-36 rounded-lg border border-line bg-white p-1.5"
                  />
                  <figcaption className="mt-1.5 text-xs text-muted">Line</figcaption>
                </figure>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
