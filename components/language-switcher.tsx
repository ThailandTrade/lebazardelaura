"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";

// Drapeaux en SVG (et non en emoji) : Windows n'affiche pas les emojis-drapeaux,
// il montre les lettres « FR » / « GB ». Le SVG s'affiche partout.

function FlagFR({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 3 2" className={className} aria-hidden="true">
      <rect width="3" height="2" fill="#fff" />
      <rect width="1" height="2" fill="#0055A4" />
      <rect x="2" width="1" height="2" fill="#EF4135" />
    </svg>
  );
}

function FlagGB({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 30" className={className} aria-hidden="true">
      <clipPath id="gb-rect">
        <path d="M0,0 v30 h60 v-30 z" />
      </clipPath>
      <clipPath id="gb-diag">
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <g clipPath="url(#gb-rect)">
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#gb-diag)" stroke="#C8102E" strokeWidth="4" />
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
}

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const router = useRouter();

  function choose(l: Locale) {
    if (l === locale) return;
    document.cookie = `lang=${l}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  const opts: { code: Locale; Flag: typeof FlagFR; label: string }[] = [
    { code: "fr", Flag: FlagFR, label: "Français" },
    { code: "en", Flag: FlagGB, label: "English" },
  ];

  return (
    <div className="inline-flex items-center gap-2" role="group" aria-label="Langue / Language">
      {opts.map(({ code, Flag, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => choose(code)}
          aria-label={label}
          aria-pressed={locale === code}
          title={label}
          className={`overflow-hidden rounded-[3px] ring-1 ring-line transition ${
            locale === code ? "opacity-100 outline outline-2 outline-accent" : "opacity-45 hover:opacity-100"
          }`}
        >
          <Flag className="block h-5 w-auto" />
        </button>
      ))}
    </div>
  );
}
