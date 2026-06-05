// Internationalisation du site public (FR par défaut / EN). Données pures,
// importable côté serveur ET client. La langue est choisie via un cookie « lang ».
import { categoryLabel, conditionLabel } from "./constants";

export type Locale = "fr" | "en";
export const DEFAULT_LOCALE: Locale = "fr";

export function normalizeLocale(v: string | undefined | null): Locale {
  return v === "en" ? "en" : "fr";
}

const messages = {
  fr: {
    nav_library: "Bibliothèque",
    nav_about: "À propos",
    nav_pile: "Ma pile à lire",
    footer_tagline: "Des livres déjà lus, prêts à repartir.",

    home_eyebrow: "Ma collection de livres français · Bangkok",
    home_h1a: "Mes livres français,",
    home_h1b: "à",
    home_h1em: "partager",
    home_hero:
      "J'ai accumulé bien trop de livres français ici, à Bangkok. Plutôt que de les laisser prendre la poussière, je préfère les faire circuler. Jette un œil. Si un titre te tente, écris-moi !",
    home_cta1: "Voir ma bibliothèque",
    home_cta2: "Deux mots sur moi",
    home_quote:
      "« Je n'arrive pas à jeter un livre. Alors plutôt que de les entasser, autant les passer à quelqu'un qui les lira. »",
    home_recent: "Les derniers arrivés",
    home_all: "Toute ma bibliothèque →",

    cat_title: "Ma bibliothèque",
    cat_subtitle:
      "Tous mes livres français d'occasion, un peu en vrac. Un coup de cœur ? Ouvre la fiche et écris-moi.",
    cat_search: "Titre ou auteur",
    cat_all: "Toutes catégories",
    cat_min: "Prix min ฿",
    cat_max: "Prix max ฿",
    cat_filter: "Filtrer",
    cat_count: (n: number) => `${n} livre${n > 1 ? "s" : ""} en ce moment`,
    cat_empty: "Rien ne correspond, là. Essaie d'élargir un peu.",

    card_from: "dès",
    card_states: (n: number) => `${n} états`,

    book_back: "← Retour à ma bibliothèque",
    book_words: "Quelques mots",
    book_publisher: "Éditeur",
    book_published: "Parution",
    book_pages: "Pages",
    book_condition: "État",
    book_reserved: "Réservé",

    avail_states: (n: number) => `Je l'ai en ${n} états :`,
    avail_state: "État :",
    avail_several: " · j'en ai plusieurs",
    avail_reserved: " · réservé",

    contact_q: "Ce livre te tente ?",
    contact_wa: "M'écrire sur WhatsApp",
    contact_line: "M'écrire sur Line",
    contact_copy: "Copier le message",
    contact_copied: "Message copié ✓",
    contact_msg: (title: string, details: string) =>
      `Coucou Laura ! Ton livre « ${title} » (${details}) me tente. Il est encore dispo ?`,

    pile_add: "Ajouter à ma pile à lire",
    pile_in: "✓ Dans ma pile à lire",
    pile_title: "Ma pile à lire",
    pile_subtitle:
      "Les livres que tu as mis de côté. Quand tu veux, envoie-moi ta sélection et on en discute.",
    pile_loading: "Un instant…",
    pile_empty: "Ta pile à lire est vide pour l'instant.",
    pile_empty_cta: "Voir ma bibliothèque",
    pile_remove: "Retirer",
    pile_talk: (n: number) => `${n} livre${n > 1 ? "s" : ""} dans ta pile. On en parle ?`,
    pile_send_wa: "Envoyer ma pile sur WhatsApp",
    pile_copy: "Copier ma sélection",
    pile_copied: "Liste copiée ✓",
    pile_clear: "Vider ma pile",
    pile_scan: "Ou scanne pour m'ajouter :",
    pile_msg: (lines: string) => `Coucou Laura ! J'aimerais bien ces livres :\n${lines}\nIls sont encore dispos ?`,

    about_title: "C'est quoi, ce bazar ?",
    about_p1:
      "Moi c'est Laura. J'habite à Bangkok et j'ai un vrai faible pour les livres, du coup j'en ai accumulé bien trop. Le bazar, c'est juste ma façon de les faire circuler : je les emmène sur des marchés, des petits événements, et je les rassemble ici.",
    about_p2:
      "Ce n'est pas une boutique : pas de panier, pas de paiement en ligne. Si un livre te plaît, tu m'écris. Juste deux personnes et un livre qui change de mains.",
    about_p3: "À bientôt, peut-être entre deux cartons de livres.",
  },

  en: {
    nav_library: "Library",
    nav_about: "About",
    nav_pile: "My reading pile",
    footer_tagline: "Already-read books, ready for a new home.",

    home_eyebrow: "My collection of French books · Bangkok",
    home_h1a: "My French books,",
    home_h1b: "to",
    home_h1em: "share",
    home_hero:
      "I've gathered far too many French books here in Bangkok. Rather than letting them gather dust, I'd rather pass them on. Have a look — if a title tempts you, just write to me!",
    home_cta1: "Browse my library",
    home_cta2: "A bit about me",
    home_quote:
      "“I just can't throw a book away. So instead of piling them up, I'd rather pass them on to someone who'll read them.”",
    home_recent: "Just arrived",
    home_all: "My whole library →",

    cat_title: "My library",
    cat_subtitle:
      "All my second-hand French books, a little jumbled. Love at first sight? Open the page and write to me.",
    cat_search: "Title or author",
    cat_all: "All categories",
    cat_min: "Min price ฿",
    cat_max: "Max price ฿",
    cat_filter: "Filter",
    cat_count: (n: number) => `${n} book${n > 1 ? "s" : ""} right now`,
    cat_empty: "Nothing matches right now. Try widening your search.",

    card_from: "from",
    card_states: (n: number) => `${n} conditions`,

    book_back: "← Back to my library",
    book_words: "A few words",
    book_publisher: "Publisher",
    book_published: "Published",
    book_pages: "Pages",
    book_condition: "Condition",
    book_reserved: "Reserved",

    avail_states: (n: number) => `I have it in ${n} conditions:`,
    avail_state: "Condition:",
    avail_several: " · I have several",
    avail_reserved: " · reserved",

    contact_q: "Tempted by this book?",
    contact_wa: "Message me on WhatsApp",
    contact_line: "Message me on Line",
    contact_copy: "Copy the message",
    contact_copied: "Message copied ✓",
    contact_msg: (title: string, details: string) =>
      `Hi Laura! I'm interested in your book “${title}” (${details}). Is it still available?`,

    pile_add: "Add to my reading pile",
    pile_in: "✓ In my reading pile",
    pile_title: "My reading pile",
    pile_subtitle: "The books you've set aside. Whenever you like, send me your selection and we'll chat.",
    pile_loading: "One moment…",
    pile_empty: "Your reading pile is empty for now.",
    pile_empty_cta: "Browse my library",
    pile_remove: "Remove",
    pile_talk: (n: number) => `${n} book${n > 1 ? "s" : ""} in your pile. Shall we talk?`,
    pile_send_wa: "Send my pile on WhatsApp",
    pile_copy: "Copy my selection",
    pile_copied: "List copied ✓",
    pile_clear: "Empty my pile",
    pile_scan: "Or scan to add me:",
    pile_msg: (lines: string) => `Hi Laura! I'd love these books:\n${lines}\nAre they still available?`,

    about_title: "What's this bazaar?",
    about_p1:
      "I'm Laura. I live in Bangkok and I have a real soft spot for books, so I've ended up with far too many. The bazaar is simply my way of passing them on: I take them to markets and small events, and gather them here.",
    about_p2:
      "It's not a shop: no cart, no online payment. If a book appeals to you, you write to me. Just two people and a book changing hands.",
    about_p3: "See you soon, maybe between two boxes of books.",
  },
};

export type Dict = (typeof messages)["fr"];

export function getDict(locale: Locale): Dict {
  return messages[locale];
}

// Libellés catégorie / état traduits (les valeurs restent les enums).
const CAT_EN: Record<string, string> = {
  roman: "Novel",
  polar_thriller: "Crime / Thriller",
  sf_fantasy: "Sci-Fi / Fantasy",
  bd_manga: "Comics / Manga",
  jeunesse: "Children's",
  documentaire: "Non-fiction",
  essai_bio: "Essay / Biography",
  cuisine_loisirs: "Cooking / Hobbies",
  art_beaux_livres: "Art / Illustrated",
  poesie_theatre: "Poetry / Theatre",
  magazine: "Magazine",
  scolaire_langues: "School / Languages",
  autre: "Other",
};
const COND_EN: Record<string, string> = {
  neuf: "New",
  comme_neuf: "Like new",
  tres_bon: "Very good",
  bon: "Good",
  correct: "Fair",
};

export function catLabel(value: string, locale: Locale): string {
  return locale === "en" ? CAT_EN[value] ?? value : categoryLabel(value);
}
export function condLabel(value: string, locale: Locale): string {
  return locale === "en" ? COND_EN[value] ?? value : conditionLabel(value);
}
