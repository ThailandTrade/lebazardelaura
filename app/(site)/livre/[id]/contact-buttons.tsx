"use client";

import { useState } from "react";
import type { Dict } from "@/lib/i18n";

export function ContactButtons({
  title,
  priceLabel,
  conditionLabel,
  t,
}: {
  title: string;
  priceLabel: string;
  conditionLabel?: string;
  t: Dict;
}) {
  const [copied, setCopied] = useState(false);

  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  const lineId = process.env.NEXT_PUBLIC_LINE_ID;
  const details = conditionLabel ? `${conditionLabel}, ${priceLabel}` : priceLabel;
  const message = t.contact_msg(title, details);

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard indispo : pas grave */
    }
  }

  // Pas de contact configuré : on n'affiche rien ici (le bouton « pile à lire » prend le relais).
  if (!whatsapp && !lineId) return null;

  return (
    <div className="rounded-xl border border-line bg-surface-2/60 p-4 sm:p-5">
      <p className="mb-3 font-serif text-lg">{t.contact_q}</p>
      <div className="flex flex-col gap-2.5">
        {whatsapp && (
          <a
            href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-[#25D366] px-5 py-3 text-center font-medium text-white transition hover:brightness-95"
          >
            {t.contact_wa}
          </a>
        )}
        {lineId && (
          <>
            <a
              href={`https://line.me/ti/p/${lineId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-[#06C755] px-5 py-3 text-center font-medium text-white transition hover:brightness-95"
            >
              {t.contact_line}
            </a>
            <button
              type="button"
              onClick={copyMessage}
              className="rounded-lg border border-line px-5 py-2.5 text-sm transition hover:bg-surface"
            >
              {copied ? t.contact_copied : t.contact_copy}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
