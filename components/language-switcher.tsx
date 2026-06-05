"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";

// Drapeaux style emoji (jeu Twemoji, open-source) servis en image : même rendu que
// les emojis 🇫🇷🇬🇧 mais lisible partout, y compris sur Windows.
export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const router = useRouter();

  function choose(l: Locale) {
    if (l === locale) return;
    document.cookie = `lang=${l}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  const opts: { code: Locale; src: string; label: string }[] = [
    { code: "fr", src: "/flags/fr.svg", label: "Français" },
    { code: "en", src: "/flags/gb.svg", label: "English" },
  ];

  return (
    <div className="inline-flex items-center gap-2.5" role="group" aria-label="Langue / Language">
      {opts.map(({ code, src, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => choose(code)}
          aria-label={label}
          aria-pressed={locale === code}
          title={label}
          className={`rounded-full transition ${
            locale === code
              ? "opacity-100 ring-2 ring-accent ring-offset-2 ring-offset-surface"
              : "opacity-40 grayscale hover:opacity-100 hover:grayscale-0"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={label} className="block h-6 w-6 rounded-full" />
        </button>
      ))}
    </div>
  );
}
