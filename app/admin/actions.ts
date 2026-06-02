"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

// Connexion admin (credentials). Renvoie un message d'erreur à afficher, ou
// laisse la redirection vers /admin se faire (signIn lève NEXT_REDIRECT en succès).
export async function authenticate(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/admin",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Email ou mot de passe incorrect.";
    }
    throw error; // ne pas avaler la redirection de Next
  }
}

export async function logout(): Promise<void> {
  await signOut({ redirectTo: "/admin/login" });
}
