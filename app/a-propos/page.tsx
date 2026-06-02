import Link from "next/link";
import { BookshelfDoodle } from "@/components/marks";

export const metadata = { title: "À propos — Le bazar de Laura" };

export default function AProposPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-6">
      <h1 className="rule-accent font-serif text-3xl tracking-tight sm:text-4xl">L&apos;histoire du bazar</h1>

      <div className="mt-8 space-y-5 text-lg leading-relaxed text-foreground/90">
        <p>
          Le bazar de Laura est une petite librairie française d&apos;occasion, installée sur les
          marchés et événements de Bangkok. Chaque livre est chiné, choisi, et raconté à la main.
        </p>
        <p>
          Ce site n&apos;est pas une boutique en ligne : c&apos;est une vitrine. Quand un livre vous
          plaît, vous m&apos;écrivez directement — on s&apos;arrange pour se retrouver sur un marché
          ou organiser la remise. Pas de panier, pas de paiement compliqué : juste une conversation.
        </p>
        <p>
          Au plaisir de vous croiser entre deux étagères.
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
        Parcourir le catalogue
      </Link>
    </main>
  );
}
