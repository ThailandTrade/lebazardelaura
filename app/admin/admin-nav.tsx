"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    href: "/admin",
    label: "Stock",
    match: (p: string) => p === "/admin" || p.startsWith("/admin/livre"),
    icon: (
      <path d="M4 6h16M4 12h16M4 18h10" strokeWidth="2" strokeLinecap="round" />
    ),
  },
  {
    href: "/admin/scan",
    label: "Scanner",
    match: (p: string) => p === "/admin/scan",
    icon: (
      <>
        <rect x="3.5" y="5.5" width="17" height="13" rx="2" strokeWidth="2" />
        <path d="M7 9v6M10 9v6M13 9v6M16.5 9v6" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
];

// Barre d'onglets en bas, atteignable au pouce.
export function AdminNav() {
  const pathname = usePathname() ?? "/admin";
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div
        className="mx-auto flex max-w-md"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {tabs.map((t) => {
          const active = t.match(pathname);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium ${
                active ? "text-accent" : "text-muted"
              }`}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                {t.icon}
              </svg>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
