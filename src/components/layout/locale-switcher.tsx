"use client"

import { useLocale, useTranslations } from "next-intl"

import { Link, usePathname } from "@/i18n/navigation"

export function LocaleSwitcher() {
  const locale = useLocale()
  const pathname = usePathname()
  const t = useTranslations("Header")
  const other = locale === "es" ? "en" : "es"

  return (
    <Link
      href={pathname}
      locale={other}
      aria-label={t("switchLocale")}
      className="rounded-full border border-line px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-muted transition-colors hover:border-accent hover:text-ink"
    >
      {other}
    </Link>
  )
}
