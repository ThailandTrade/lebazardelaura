// Libellés FR et valeurs des enums (alignés sur le schéma §6).

export const CATEGORIES = [
  { value: "roman", label: "Roman" },
  { value: "polar_thriller", label: "Polar / Thriller" },
  { value: "sf_fantasy", label: "SF / Fantasy" },
  { value: "bd_manga", label: "BD / Manga" },
  { value: "jeunesse", label: "Jeunesse" },
  { value: "documentaire", label: "Documentaire" },
  { value: "essai_bio", label: "Essai / Biographie" },
  { value: "cuisine_loisirs", label: "Cuisine / Loisirs" },
  { value: "art_beaux_livres", label: "Art / Beaux livres" },
  { value: "poesie_theatre", label: "Poésie / Théâtre" },
  { value: "magazine", label: "Magazine" },
  { value: "scolaire_langues", label: "Scolaire / Langues" },
  { value: "autre", label: "Autre" },
] as const;

export const CONDITIONS = [
  { value: "neuf", label: "Neuf" },
  { value: "comme_neuf", label: "Comme neuf" },
  { value: "tres_bon", label: "Très bon" },
  { value: "bon", label: "Bon" },
  { value: "correct", label: "Correct" },
] as const;

export const STATUSES = [
  { value: "disponible", label: "Disponible" },
  { value: "reserve", label: "Réservé" },
  { value: "vendu", label: "Vendu" },
  { value: "masque", label: "Masqué" },
] as const;

export const QUICK_PRICES = [80, 120, 150, 180, 230] as const;

export type BookCategory = (typeof CATEGORIES)[number]["value"];
export type BookCondition = (typeof CONDITIONS)[number]["value"];
export type BookStatus = (typeof STATUSES)[number]["value"];

export const CATEGORY_VALUES = CATEGORIES.map((c) => c.value);
export const CONDITION_VALUES = CONDITIONS.map((c) => c.value);
export const STATUS_VALUES = STATUSES.map((s) => s.value);

const CATEGORY_LABELS = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));
const CONDITION_LABELS = Object.fromEntries(CONDITIONS.map((c) => [c.value, c.label]));
const STATUS_LABELS = Object.fromEntries(STATUSES.map((s) => [s.value, s.label]));

export const categoryLabel = (v: string) => CATEGORY_LABELS[v] ?? v;
export const conditionLabel = (v: string) => CONDITION_LABELS[v] ?? v;
export const statusLabel = (v: string) => STATUS_LABELS[v] ?? v;

/** Prix en THB, à la thaïlandaise (montant puis ฿), sans décimales superflues. */
export function formatPrice(price: number | string): string {
  const n = typeof price === "string" ? Number(price) : price;
  if (!Number.isFinite(n)) return "";
  const rounded = Math.round(n * 100) / 100;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(2)}฿`;
}

/** Suggestion de catégorie à partir des catégories renvoyées par Google Books. */
export function suggestCategory(googleCategories: string[] | undefined): BookCategory {
  const hay = (googleCategories ?? []).join(" ").toLowerCase();
  const has = (...kw: string[]) => kw.some((k) => hay.includes(k));
  if (has("juvenile", "jeunesse", "children")) return "jeunesse";
  if (has("comic", "graphic novel", "manga", "bande dessinée")) return "bd_manga";
  if (has("mystery", "thriller", "detective", "polar")) return "polar_thriller";
  if (has("science fiction", "fantasy", "fantastique")) return "sf_fantasy";
  if (has("poetry", "drama", "poésie", "théâtre", "theatre")) return "poesie_theatre";
  if (has("cooking", "cuisine", "craft", "loisir")) return "cuisine_loisirs";
  if (has("art", "photography", "beaux")) return "art_beaux_livres";
  if (has("biography", "autobiograph", "biograph")) return "essai_bio";
  if (has("juvenile nonfiction", "science", "history", "documentaire")) return "documentaire";
  if (has("language", "study", "scolaire", "langue")) return "scolaire_langues";
  if (has("fiction", "roman", "literary")) return "roman";
  return "autre";
}
