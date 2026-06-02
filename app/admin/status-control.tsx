"use client";

import { useTransition } from "react";
import { STATUSES, type BookStatus } from "@/lib/constants";
import { quickStatusAction } from "./book-actions";

// Changement de statut en un tap (dashboard).
export function StatusControl({ id, status }: { id: string; status: BookStatus }) {
  const [pending, start] = useTransition();
  return (
    <select
      defaultValue={status}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as BookStatus;
        start(() => {
          void quickStatusAction(id, next);
        });
      }}
      className="rounded border border-neutral-300 px-2 py-1 text-sm disabled:opacity-50"
    >
      {STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
