"use client";

import { useRouter } from "next/navigation";

// Retour à la page précédente (le rayon/la liste d'où l'on vient), pas la page d'accueil.
export function BackButton({ label }: { label: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) router.back();
        else router.push("/admin");
      }}
      className="text-sm text-muted underline-offset-4 hover:underline"
    >
      {label}
    </button>
  );
}
