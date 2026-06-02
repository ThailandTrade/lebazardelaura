"use client";

import { useState } from "react";

export function ContactButtons({ title, priceLabel }: { title: string; priceLabel: string }) {
  const [copied, setCopied] = useState(false);

  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  const lineId = process.env.NEXT_PUBLIC_LINE_ID;
  const message = `Bonjour Laura ! Je suis intéressé(e) par « ${title} » (${priceLabel}) vu sur Le bazar de Laura.`;

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
      <p className="rounded border border-dashed border-neutral-300 p-4 text-sm text-neutral-500">
        Contact bientôt disponible.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {whatsapp && (
        <a
          href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-[#25D366] px-5 py-3 text-center font-medium text-white"
        >
          Écrire sur WhatsApp
        </a>
      )}
      {lineId && (
        <div className="flex flex-col gap-2">
          <a
            href={`https://line.me/R/ti/p/${lineId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-[#06C755] px-5 py-3 text-center font-medium text-white"
          >
            Contacter sur Line
          </a>
          <button
            type="button"
            onClick={copyMessage}
            className="rounded-lg border border-neutral-300 px-5 py-2 text-sm"
          >
            {copied ? "Message copié ✓" : "Copier le message à envoyer"}
          </button>
        </div>
      )}
    </div>
  );
}
