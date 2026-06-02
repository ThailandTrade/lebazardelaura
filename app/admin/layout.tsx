import Link from "next/link";
import { Logo } from "@/components/marks";
import { AdminNav } from "./admin-nav";
import { ServiceWorkerRegister } from "./sw-register";

export const metadata = {
  title: { default: "Admin — Le bazar de Laura", template: "%s · Bazar Admin" },
};

// Coque de l'appli admin (PWA mobile) : barre haute compacte + onglets en bas.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <ServiceWorkerRegister />

      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-2.5">
          <Link href="/admin" className="flex items-center gap-2">
            <Logo size={22} className="text-foreground" />
            <span className="font-serif text-base">Bazar · admin</span>
          </Link>
          <Link href="/" className="text-xs text-muted underline-offset-2 hover:underline">
            Voir le site
          </Link>
        </div>
      </header>

      <div className="flex-1 pb-24">{children}</div>

      <AdminNav />
    </div>
  );
}
