import { PilePage } from "@/components/pile";

export const metadata = { title: "Ma pile à lire — Le bazar de Laura" };

export default function MaPileRoute() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-12 sm:px-6">
      <h1 className="rule-accent font-serif text-3xl tracking-tight sm:text-4xl">Ma pile à lire</h1>
      <p className="mt-4 max-w-xl text-muted">
        Les livres que tu as mis de côté. Quand tu veux, envoie-moi ta sélection et on en discute.
      </p>
      <PilePage />
    </main>
  );
}
