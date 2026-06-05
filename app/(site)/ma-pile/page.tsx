import { PilePage } from "@/components/pile";
import { getServerLocale } from "@/lib/i18n-server";
import { getDict } from "@/lib/i18n";

export const metadata = { title: "Ma pile à lire — Le bazar de Laura" };

export default async function MaPileRoute() {
  const locale = await getServerLocale();
  const t = getDict(locale);
  return (
    <main className="mx-auto max-w-2xl px-5 py-12 sm:px-6">
      <h1 className="rule-accent font-serif text-3xl tracking-tight sm:text-4xl">{t.pile_title}</h1>
      <p className="mt-4 max-w-xl text-muted">{t.pile_subtitle}</p>
      <PilePage t={t} />
    </main>
  );
}
