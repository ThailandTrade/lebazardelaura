import Link from "next/link";
import { formatPrice, conditionLabel } from "@/lib/constants";
import type { PublicBook } from "@/lib/books";

export function BookCard({ book }: { book: PublicBook }) {
  return (
    <Link href={`/livre/${book.id}`} className="group flex flex-col">
      <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-surface-2 shadow-[0_1px_2px_rgba(43,37,29,0.12)] ring-1 ring-line transition duration-200 group-hover:-translate-y-1 group-hover:shadow-[0_10px_24px_rgba(43,37,29,0.16)]">
        {book.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.cover_url}
            alt={`Couverture de ${book.title}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-3 text-center font-serif text-sm text-muted">
            {book.title}
          </div>
        )}
        {book.status === "reserve" && (
          <span className="absolute left-2 top-2 rounded-sm bg-foreground/85 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white backdrop-blur-sm">
            Réservé
          </span>
        )}
      </div>

      <div className="mt-3">
        <h3 className="line-clamp-2 font-serif text-[15px] leading-snug group-hover:text-accent">
          {book.title}
        </h3>
        {book.authors.length > 0 && (
          <p className="mt-0.5 line-clamp-1 text-sm text-muted">{book.authors.join(", ")}</p>
        )}
        <p className="mt-1.5 flex items-baseline gap-2 text-sm">
          <span className="font-semibold">{formatPrice(book.price)}</span>
          <span className="text-muted">· {conditionLabel(book.condition)}</span>
        </p>
      </div>
    </Link>
  );
}
