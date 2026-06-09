"use client";

import { useFormStatus } from "react-dom";

// Bouton d'envoi qui indique l'enregistrement en cours (retour visuel après validation,
// puisqu'on ne quitte plus la fiche).
export function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-accent px-5 py-3 text-base font-medium text-white transition hover:bg-accent-dark disabled:opacity-70"
    >
      {pending ? "Enregistrement…" : label}
    </button>
  );
}
