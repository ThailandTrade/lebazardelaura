"use client";

import { useState } from "react";

export function ContactButtons({
  title,
  priceLabel,
  conditionLabel,
}: {
  title: string;
  priceLabel: string;
  conditionLabel?: string;
}) {
  const [copied, setCopied] = useState(false);

  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  const lineId = process.env.NEXT_PUBLIC_LINE_ID;
  const details = conditionLabel ? `${conditionLabel}, ${priceLabel}` : priceLabel;
  const message = `Coucou Laura ! Ton livre « ${title} » (${details}) me tente — il est encore dispo ?`;

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard indispo : pas grave */
    }
  }

  if (!whatsapp && !lineId) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-surface-2/50 p-4 text-sm text-muted">
        Ça t&apos;intéresse ? Je mettrai bientôt un moyen de me joindre juste ici.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-surface-2/60 p-4 sm:p-5">
      <p className="mb-3 font-serif text-lg">Ce livre te tente ?</p>
      <div className="flex flex-col gap-2.5">
        {whatsapp && (
          <a
            href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-[#25D366] px-5 py-3 text-center font-medium text-white transition hover:brightness-95"
          >
            M&apos;écrire sur WhatsApp
          </a>
        )}
        {lineId && (
          <>
            <a
              href={`https://line.me/R/ti/p/${lineId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-[#06C755] px-5 py-3 text-center font-medium text-white transition hover:brightness-95"
            >
              M&apos;écrire sur Line
            </a>
            <button
              type="button"
              onClick={copyMessage}
              className="rounded-lg border border-line px-5 py-2.5 text-sm transition hover:bg-surface"
            >
              {copied ? "Message copié ✓" : "Copier le message"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
