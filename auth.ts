import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";

// Auth.js v5 — une seule utilisatrice (Laura), credentials + session JWT.
// Sous Next 16, le proxy tourne en runtime Node : pas de contrainte edge,
// on peut donc interroger Postgres et utiliser bcrypt directement.

type AdminRow = { id: string; email: string; password_hash: string };

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true, // auto-hébergé : on fait confiance à l'hôte du reverse proxy
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      authorize: async (creds) => {
        const email = String(creds?.email ?? "").trim().toLowerCase();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;

        const rows = await query<AdminRow>(
          "select id, email, password_hash from admin_users where email = $1",
          [email],
        );
        const user = rows[0];
        if (!user) return null;

        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) return null;

        return { id: user.id, email: user.email };
      },
    }),
  ],
  callbacks: {
    // Redirige les visiteurs non connectés hors de /admin (sauf la page de login).
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = Boolean(auth?.user);
      const path = nextUrl.pathname;
      const isLoginPage = path === "/admin/login";
      const isAdminArea = path === "/admin" || path.startsWith("/admin/");

      if (isAdminArea && !isLoginPage) return isLoggedIn;
      return true;
    },
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id && session.user) session.user.id = String(token.id);
      return session;
    },
  },
});
