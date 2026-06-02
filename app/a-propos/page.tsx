import Link from "next/link";

export const metadata = { title: "À propos — Le bazar de Laura" };

export default function AProposPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="font-serif text-3xl">À propos</h1>

      <div className="mt-6 space-y-4 leading-relaxed text-neutral-700">
        <p>
          Le bazar de Laura est une petite librairie française d&apos;occasion, installée sur les
          marchés et événements de Bangkok. Chaque livre est chiné, choisi et raconté à la main.
        </p>
        <p>
          Ce site n&apos;est pas une boutique en ligne : c&apos;est une vitrine. Quand un livre vous
          plaît, écrivez-moi directement — on s&apos;arrange pour se retrouver sur un marché ou
          organiser la remise.
        </p>
        <p>
          Au plaisir de vous croiser entre deux étagères !<br />
          <span className="font-serif italic">— Laura</span>
        </p>
      </div>

      <Link
        href="/catalogue"
        className="mt-8 inline-block rounded-full bg-accent px-6 py-3 font-medium text-white"
      >
        Parcourir le catalogue
      </Link>
    </main>
  );
}
