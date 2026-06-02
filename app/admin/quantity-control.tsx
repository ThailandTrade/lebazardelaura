"use client";

import { useState, useTransition } from "react";
import { adjustQuantityAction } from "./book-actions";

// Réglage rapide de la quantité (−/+) depuis le tableau de bord.
export function QuantityControl({ id, quantity }: { id: string; quantity: number }) {
  const [pending, start] = useTransition();
  const [value, setValue] = useState(quantity);

  function change(delta: number) {
    const next = Math.max(0, value + delta);
    if (next === value) return;
    setValue(next);
    start(() => {
      void adjustQuantityAction(id, delta);
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => change(-1)}
        disabled={pending || value <= 0}
        aria-label="Retirer un exemplaire"
        className="h-7 w-7 rounded-md border border-line bg-surface text-lg leading-none disabled:opacity-40"
      >
        −
      </button>
      <span className="w-6 text-center text-sm tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => change(1)}
        disabled={pending}
        aria-label="Ajouter un exemplaire"
        className="h-7 w-7 rounded-md border border-line bg-surface text-lg leading-none disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}
