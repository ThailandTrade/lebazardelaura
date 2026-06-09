"use client";

import { useRouter } from "next/navigation";

// Retour à la page précédente (le rayon / la recherche d'où l'on vient) ; repli sur
// une URL donnée s'il n'y a pas d'historique (lien direct, nouvel onglet).
export function BackLink({ label, fallback }: { label: string; fallback: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      className="text-sm text-muted underline-offset-4 hover:underline"
    >
      {label}
    </button>
  );
}
