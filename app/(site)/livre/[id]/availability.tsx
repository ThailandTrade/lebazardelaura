"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/constants";
import { condLabel, fmt, type Dict, type Locale } from "@/lib/i18n";
import type { BookVariant } from "@/lib/books";
import { AddToPileButton } from "@/components/pile";

export function Availability({
  variants,
  title,
  cover_url,
  t,
  locale,
}: {
  variants: BookVariant[];
  title: string;
  cover_url: string | null;
  t: Dict;
  locale: Locale;
}) {
  const [sel, setSel] = useState(0);
  const v = variants[sel] ?? variants[0];

  const pileItem = {
    id: v.id,
    title,
    conditionLabel: condLabel(v.condition, locale),
    priceLabel: formatPrice(v.price),
    cover_url,
  };

  return (
    <div className="mt-6">
      {variants.length === 1 ? (
        // Un seul état : présentation classique (gros prix + état).
        <>
          <div className="flex items-center gap-3">
            <span className="font-serif text-3xl text-accent">{formatPrice(v.price)}</span>
            {v.status === "reserve" && <ReservedBadge label={t.book_reserved} />}
          </div>
          <p className="mt-2 text-sm text-muted">
            {t.avail_state} {condLabel(v.condition, locale)}
            {v.quantity > 1 ? t.avail_several : ""}
          </p>
        </>
      ) : (
        // Plusieurs états : état sur la ligne du haut, prix juste en dessous. Cliquable.
        <>
          <p className="text-sm text-muted">{fmt(t.avail_states, { n: variants.length })}</p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {variants.map((variant, i) => {
              const active = i === sel;
              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => setSel(i)}
                  aria-pressed={active}
                  className={`min-w-[7rem] rounded-lg border px-4 py-2.5 text-center transition ${
                    active ? "border-accent bg-accent/10" : "border-line hover:border-accent"
                  }`}
                >
                  <span className="block text-sm">
                    {condLabel(variant.condition, locale)}
                    {variant.status === "reserve" ? t.avail_reserved : ""}
                  </span>
                  <span className="mt-0.5 block font-serif text-2xl text-accent">{formatPrice(variant.price)}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="mt-8 flex flex-col gap-3">
        <p className="text-[15px] leading-relaxed text-muted">{t.pile_cta}</p>
        <AddToPileButton item={pileItem} t={t} />
      </div>
    </div>
  );
}

function ReservedBadge({ label }: { label: string }) {
  return (
    <span className="rounded-sm bg-foreground/85 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-white">
      {label}
    </span>
  );
}
