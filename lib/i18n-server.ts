import { cookies } from "next/headers";
import { normalizeLocale, type Locale } from "./i18n";

// Langue choisie (cookie « lang »), lue côté serveur. FR par défaut.
export async function getServerLocale(): Promise<Locale> {
  const c = await cookies();
  return normalizeLocale(c.get("lang")?.value);
}
