import Link from "next/link";
import { Logo } from "@/components/marks";
import { PileProvider, PileNavButton } from "@/components/pile";

// Coque du site public (vitrine) : en-tête + pied de page.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <PileProvider>
    <div className="flex min-h-full flex-col">
      <div className="h-1 w-full bg-accent" aria-hidden="true" />

      <header className="border-b border-line bg-surface/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={28} className="text-foreground" />
            <span className="font-serif text-xl tracking-tight">Le bazar de Laura</span>
          </Link>
          <nav className="flex items-center gap-4 text-[15px] sm:gap-6">
            <Link href="/catalogue" className="decoration-accent/60 underline-offset-4 hover:underline">
              Bibliothèque
            </Link>
            <Link href="/a-propos" className="hidden decoration-accent/60 underline-offset-4 hover:underline sm:inline">
              À propos
            </Link>
            <PileNavButton />
          </nav>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="mt-20 border-t border-line bg-surface/60">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-5 py-10 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <Logo size={22} className="text-foreground" />
              <span className="font-serif text-lg">Le bazar de Laura</span>
            </div>
          </div>
          <p className="font-serif text-sm italic text-muted">Des livres déjà lus, prêts à repartir.</p>
        </div>
      </footer>
    </div>
    </PileProvider>
  );
}
