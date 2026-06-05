import Link from "next/link";
import { BookshelfDoodle } from "@/components/marks";
import { getServerLocale } from "@/lib/i18n-server";
import { getDict } from "@/lib/i18n";

export const metadata = { title: "À propos — Le bazar de Laura" };

export default async function AProposPage() {
  const locale = await getServerLocale();
  const t = getDict(locale);

  return (
    <main className="mx-auto max-w-3xl px-5 py-12 sm:px-6">
      <h1 className="rule-accent font-serif text-3xl tracking-tight sm:text-4xl">{t.about_title}</h1>

      <div className="mt-8 space-y-5 text-lg leading-relaxed text-foreground/90">
        <p>{t.about_p1}</p>
        <p>{t.about_p2}</p>
        <p>{t.about_p3}</p>
        <p className="font-serif text-xl italic text-muted">Laura</p>
      </div>

      <div className="mt-10 text-foreground">
        <BookshelfDoodle className="w-full max-w-md" />
      </div>

      <Link
        href="/catalogue"
        className="mt-10 inline-block rounded-full bg-accent px-7 py-3 font-medium text-white transition hover:bg-accent-dark"
      >
        {t.home_cta1}
      </Link>
    </main>
  );
}
