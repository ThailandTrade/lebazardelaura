import type { Metadata } from "next";
import Link from "next/link";
import { Inter, Fraunces } from "next/font/google";
import { Logo } from "@/components/marks";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: { default: "Le bazar de Laura", template: "%s" },
  description:
    "Livres français d'occasion, chinés avec soin à Bangkok. Parcourez le catalogue et écrivez à Laura.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${inter.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <div className="h-1 w-full bg-accent" aria-hidden="true" />

        <header className="border-b border-line bg-surface/60">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <Logo size={28} className="text-foreground" />
              <span className="font-serif text-xl tracking-tight">Le bazar de Laura</span>
            </Link>
            <nav className="flex items-center gap-6 text-[15px]">
              <Link href="/catalogue" className="decoration-accent/60 underline-offset-4 hover:underline">
                Catalogue
              </Link>
              <Link href="/a-propos" className="decoration-accent/60 underline-offset-4 hover:underline">
                À propos
              </Link>
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
              <p className="mt-2 max-w-sm text-sm text-muted">
                Une petite librairie française d&apos;occasion qui voyage de marché en marché à Bangkok.
              </p>
            </div>
            <p className="font-serif text-sm italic text-muted">Fait avec soin, un livre à la fois.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
