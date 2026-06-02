import Link from "next/link";
import { formatPrice, conditionLabel } from "@/lib/constants";
import type { PublicBook } from "@/lib/books";

export function BookCard({ book }: { book: PublicBook }) {
  return (
    <Link href={`/livre/${book.id}`} className="group flex flex-col">
      <div className="relative aspect-[2/3] overflow-hidden rounded bg-neutral-100">
        {book.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.cover_url}
            alt={`Couverture de ${book.title}`}
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-3 text-center text-sm text-neutral-400">
            {book.title}
          </div>
        )}
        {book.status === "reserve" && (
          <span className="absolute left-2 top-2 rounded bg-amber-600/90 px-2 py-0.5 text-xs text-white">
            Réservé
          </span>
        )}
      </div>
      <div className="mt-2">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">{book.title}</h3>
        {book.authors.length > 0 && (
          <p className="line-clamp-1 text-sm text-neutral-500">{book.authors.join(", ")}</p>
        )}
        <p className="mt-1 text-sm">
          <span className="font-semibold">{formatPrice(book.price)}</span>
          <span className="text-neutral-400"> · {conditionLabel(book.condition)}</span>
        </p>
      </div>
    </Link>
  );
}
