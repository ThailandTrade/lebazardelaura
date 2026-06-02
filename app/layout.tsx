import type { Metadata } from "next";
import Link from "next/link";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "Le bazar de Laura",
  description:
    "Livres français d'occasion, chinés avec soin à Bangkok. Parcourez le catalogue et contactez Laura.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${inter.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="border-b border-black/10">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
            <Link href="/" className="font-serif text-xl">
              Le bazar de Laura
            </Link>
            <nav className="flex gap-5 text-sm">
              <Link href="/catalogue" className="hover:text-accent">Catalogue</Link>
              <Link href="/a-propos" className="hover:text-accent">À propos</Link>
            </nav>
          </div>
        </header>

        <div className="flex-1">{children}</div>

        <footer className="mt-16 border-t border-black/10">
          <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-muted sm:px-6">
            Le bazar de Laura — livres français d&apos;occasion à Bangkok.
          </div>
        </footer>
      </body>
    </html>
  );
}
