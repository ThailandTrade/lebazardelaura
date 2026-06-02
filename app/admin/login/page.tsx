import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Connexion admin — Le bazar de Laura" };

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/admin");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-1 text-2xl font-semibold">Espace admin</h1>
      <p className="mb-6 text-sm text-neutral-500">Le bazar de Laura</p>
      <LoginForm />
    </main>
  );
}
