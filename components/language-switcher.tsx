"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";

// Sélecteur de langue compact (drapeaux). Écrit un cookie « lang » puis rafraîchit
// les composants serveur pour ré-rendre le site dans la langue choisie.
export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const router = useRouter();

  function choose(l: Locale) {
    if (l === locale) return;
    document.cookie = `lang=${l}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  const opts: { code: Locale; flag: string; label: string }[] = [
    { code: "fr", flag: "🇫🇷", label: "Français" },
    { code: "en", flag: "🇬🇧", label: "English" },
  ];

  return (
    <div className="inline-flex items-center gap-1" role="group" aria-label="Langue / Language">
      {opts.map((o) => (
        <button
          key={o.code}
          type="button"
          onClick={() => choose(o.code)}
          aria-label={o.label}
          aria-pressed={locale === o.code}
          title={o.label}
          className={`rounded-md px-1.5 py-1 text-lg leading-none transition ${
            locale === o.code ? "bg-surface-2 ring-1 ring-line" : "opacity-50 hover:opacity-100"
          }`}
        >
          {o.flag}
        </button>
      ))}
    </div>
  );
}
