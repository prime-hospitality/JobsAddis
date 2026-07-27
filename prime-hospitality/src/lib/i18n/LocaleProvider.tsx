"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { en, type Catalog } from "./en";
import { am } from "./am";
import { DEFAULT_LANG, LANG_STORAGE_KEY, isLang, type Lang } from "./types";

/** Dot-paths to every string leaf in the catalog, e.g. "nav.home". */
type Leaves<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Leaves<T[K]>}`;
}[keyof T & string];

export type TKey = Leaves<Catalog>;

export type TParams = Record<string, string | number>;

/** `tNode` additionally accepts ready-made elements, e.g. a styled <span>. */
export type TNodeParams = Record<string, string | number | React.ReactElement>;

const CATALOGS: Record<Lang, unknown> = { en, am };

function resolve(catalog: unknown, key: string): string | undefined {
  let node: unknown = catalog;
  for (const segment of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[segment];
  }
  return typeof node === "string" ? node : undefined;
}

/** Replaces every `{name}` placeholder with the matching param. */
function interpolate(template: string, params?: TParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match
  );
}

interface LocaleContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Translate;
}

/**
 * Looks up a string, interpolating `{placeholders}`. Falls back to English.
 *
 * `t.node(...)` is the same lookup but returns elements: plain values are
 * wrapped in `<b>` (notification bodies), while a passed element is inserted
 * as-is (headings that style the substituted name themselves).
 *
 * `t.lang` is the active language, for the formatters in `format.ts`.
 */
export interface Translate {
  (key: TKey, params?: TParams): string;
  node: (key: TKey, params?: TNodeParams) => React.ReactNode;
  lang: Lang;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readStoredLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (isLang(saved)) return saved;
  } catch {}
  return DEFAULT_LANG;
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  // The inline script in layout.tsx has already applied the stored language to
  // <html lang> before paint; this just mirrors it into React state.
  const [lang, setLangState] = useState<Lang>(readStoredLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {}
  }, []);

  const value = useMemo<LocaleContextValue>(() => {
    const lookup = (key: string): string =>
      resolve(CATALOGS[lang], key) ?? resolve(en, key) ?? key;

    const t = ((key: TKey, params?: TParams) => interpolate(lookup(key), params)) as Translate;

    t.node = (key: TKey, params?: TNodeParams): React.ReactNode => {
      const template = lookup(key);
      if (!params) return template;

      // Split on placeholders, keeping them, so each one can become an element.
      const parts = template.split(/(\{\w+\})/g);
      return parts.map((part, i) => {
        const match = /^\{(\w+)\}$/.exec(part);
        if (!match) return part;
        const name = match[1];
        if (!(name in params)) return part;
        const value = params[name];
        return React.isValidElement(value)
          ? React.cloneElement(value, { key: i })
          : <b key={i}>{String(value)}</b>;
      });
    };

    t.lang = lang;

    return { lang, setLang, t };
  }, [lang, setLang]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

function useLocaleContext(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside <LocaleProvider>");
  return ctx;
}

/** `const { lang, setLang } = useLocale()` — for the language pickers. */
export function useLocale() {
  const { lang, setLang } = useLocaleContext();
  return { lang, setLang };
}

/** `const t = useT()` — the common case. `t.node(...)` for bolded interpolation. */
export function useT(): Translate {
  return useLocaleContext().t;
}
