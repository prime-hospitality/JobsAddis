export type Lang = "en" | "am";

export const LANGS: Lang[] = ["en", "am"];

export const LANG_STORAGE_KEY = "lang";

export const DEFAULT_LANG: Lang = "en";

/** Native label for each language, shown in the language pickers. */
export const LANG_LABELS: Record<Lang, string> = {
  en: "English",
  am: "አማርኛ",
};

export function isLang(value: unknown): value is Lang {
  return value === "en" || value === "am";
}

/**
 * Every leaf in a catalog is a string. `am.ts` is typed as a deep partial of
 * `en.ts` so an untranslated key is not a type error — it falls back to English
 * at runtime instead.
 */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends string ? string : DeepPartial<T[K]>;
};
