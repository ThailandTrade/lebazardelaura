// Protection des routes /admin/* via la session Auth.js.
// Next 16 : la fonction s'appelle `proxy` (ex-`middleware`) et tourne en runtime Node.
// La logique de redirection est dans le callback `authorized` (voir auth.ts).
export { auth as proxy } from "@/auth";

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
