import Link from "next/link";
import { BookshelfDoodle } from "@/components/marks";

export const metadata = { title: "À propos — Le bazar de Laura" };

export default function AProposPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-6">
      <h1 className="rule-accent font-serif text-3xl tracking-tight sm:text-4xl">C&apos;est quoi, ce bazar ?</h1>

      <div className="mt-8 space-y-5 text-lg leading-relaxed text-foreground/90">
        <p>
          Moi c&apos;est Laura. J&apos;habite à Bangkok et j&apos;ai un vrai faible pour les livres —
          du coup j&apos;en ai accumulé bien trop. Le bazar, c&apos;est juste ma façon de les faire
          circuler : je les emmène sur des marchés, des petits événements, et je les rassemble ici.
        </p>
        <p>
          Ce n&apos;est pas une boutique : pas de panier, pas de paiement en ligne. Si un livre te
          plaît, tu m&apos;écris. Juste deux personnes et un livre qui change de mains.
        </p>
        <p>
          À bientôt, peut-être entre deux cartons de livres.
        </p>
        <p className="font-serif text-xl italic text-muted">— Laura</p>
      </div>

      <div className="mt-10 text-foreground">
        <BookshelfDoodle className="w-full max-w-md" />
      </div>

      <Link
        href="/catalogue"
        className="mt-10 inline-block rounded-full bg-accent px-7 py-3 font-medium text-white transition hover:bg-accent-dark"
      >
        Voir ma bibliothèque
      </Link>
    </main>
  );
}
