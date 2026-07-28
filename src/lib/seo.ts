import type { Metadata } from "next"

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

function localePath(locale: string, path: string): string {
  const clean = path === "/" ? "" : path
  return locale === "es" ? clean || "/" : `/en${clean}`
}

/**
 * Canonical + hreflang para una ruta en el locale actual.
 * Español vive en la raíz (x-default); inglés bajo /en.
 */
export function pageAlternates(
  locale: string,
  path: string,
): NonNullable<Metadata["alternates"]> {
  return {
    canonical: localePath(locale, path),
    languages: {
      es: localePath("es", path),
      en: localePath("en", path),
      "x-default": localePath("es", path),
    },
  }
}

export function ogLocale(locale: string): string {
  return locale === "es" ? "es_US" : "en_US"
}
