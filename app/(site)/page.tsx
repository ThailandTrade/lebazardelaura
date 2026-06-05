import Link from "next/link";
import { listPublicBookGroups } from "@/lib/books";
import { BookCard } from "@/components/book-card";
import { BookshelfDoodle } from "@/components/marks";

export default async function HomePage() {
  const latest = (await listPublicBookGroups()).slice(0, 10);

  return (
    <main>
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-5 pt-14 sm:px-6 sm:pt-20">
        <div className="grid items-center gap-10 sm:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="mb-4 text-sm uppercase tracking-[0.2em] text-muted">
              Librairie française d&apos;occasion · Bangkok
            </p>
            <h1 className="font-serif text-4xl leading-[1.05] tracking-tight sm:text-5xl">
              Des livres français,
              <br />
              <span className="italic text-accent">chinés</span> avec soin.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-muted">
              Une collection qui voyage de marché en marché. Parcourez les rayons en ligne, et si un
              livre vous fait de l&apos;œil, écrivez-moi — on s&apos;arrange.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/catalogue"
                className="rounded-full bg-accent px-7 py-3 font-medium text-white transition hover:bg-accent-dark"
              >
                Voir le catalogue
              </Link>
              <Link
                href="/a-propos"
                className="decoration-accent/60 underline-offset-4 hover:underline"
              >
                L&apos;histoire du bazar
              </Link>
            </div>
          </div>

          <div className="text-foreground">
            <BookshelfDoodle className="w-full" />
          </div>
        </div>
      </section>

      {/* Mot de Laura */}
      <section className="mx-auto mt-16 max-w-5xl px-5 sm:px-6">
        <figure className="rounded-2xl border border-line bg-surface-2/70 px-6 py-8 sm:px-10 sm:py-10">
          <blockquote className="font-serif text-xl leading-relaxed sm:text-2xl">
            « Chaque livre ici a déjà eu une vie. J&apos;aime l&apos;idée de lui en offrir une
            seconde, entre les mains de quelqu&apos;un d&apos;autre. »
          </blockquote>
          <figcaption className="mt-4 font-serif italic text-muted">— Laura</figcaption>
        </figure>
      </section>

      {/* Derniers arrivages */}
      {latest.length > 0 && (
        <section className="mx-auto mt-16 max-w-5xl px-5 sm:px-6">
          <div className="mb-8 flex items-baseline justify-between">
            <h2 className="rule-accent font-serif text-2xl">Derniers arrivages</h2>
            <Link href="/catalogue" className="text-sm text-muted underline-offset-4 hover:underline">
              Tout voir →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 md:grid-cols-5">
            {latest.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
