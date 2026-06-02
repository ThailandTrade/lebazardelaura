"use client";

import { useState } from "react";

type Candidate = { url: string; source: string };

// Recherche et choix d'une couverture parmi plusieurs candidates (+ Google Images).
export function CoverPicker({
  isbn,
  title,
  author,
  onPick,
}: {
  isbn: string;
  title: string;
  author: string;
  onPick: (url: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [manual, setManual] = useState("");

  async function load() {
    setOpen(true);
    if (!isbn.trim()) return; // sans ISBN : on propose Google Images + URL manuelle
    setLoading(true);
    setSearched(true);
    try {
      const q = new URLSearchParams();
      if (title.trim()) q.set("title", title.trim());
      if (author.trim()) q.set("author", author.trim());
      const res = await fetch(`/api/covers/${encodeURIComponent(isbn.trim())}?${q.toString()}`);
      const j = await res.json();
      setCandidates(Array.isArray(j.candidates) ? j.candidates : []);
    } catch {
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }

  function choose(url: string) {
    onPick(url);
    setOpen(false);
  }

  const googleImages = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(
    `${isbn || title} couverture livre`,
  )}`;

  return (
    <div>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : load())}
        className="rounded-md border border-line bg-surface px-3 py-2 text-sm transition hover:bg-surface-2"
      >
        {open ? "Fermer la recherche" : "Chercher une couverture"}
      </button>

      {open && (
        <div className="mt-3 rounded-lg border border-line bg-surface-2/50 p-3">
          {loading && (
            <div className="flex items-center gap-2 py-6 text-sm text-muted">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-accent" />
              Recherche des couvertures…
            </div>
          )}

          {!loading && candidates.length > 0 && (
            <>
              <p className="mb-2 text-sm text-muted">Touche une couverture pour la choisir :</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {candidates.map((c) => (
                  <button
                    key={c.url}
                    type="button"
                    onClick={() => choose(c.url)}
                    className="group overflow-hidden rounded border border-line bg-surface"
                    title={c.source}
                  >
                    <span className="block aspect-[2/3]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c.url} alt={c.source} className="h-full w-full object-cover" loading="lazy" />
                    </span>
                    <span className="block truncate px-1 py-0.5 text-[10px] text-muted">{c.source}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {!loading && searched && candidates.length === 0 && (
            <p className="py-2 text-sm text-muted">Aucune couverture trouvée automatiquement.</p>
          )}

          <div className="mt-3 border-t border-line pt-3">
            <a
              href={googleImages}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-md bg-foreground px-3 py-2 text-sm font-medium text-white"
            >
              Chercher sur Google Images
            </a>
            <p className="mt-2 text-xs text-muted">
              Sur l&apos;image voulue : appui long → « Copier l&apos;adresse de l&apos;image », puis colle-la ici.
            </p>
            <div className="mt-2 flex gap-2">
              <input
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="https://…/couverture.jpg"
                className="min-w-0 flex-1 rounded-md border border-line bg-surface px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => manual.trim() && choose(manual.trim())}
                disabled={!manual.trim()}
                className="shrink-0 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Utiliser
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
