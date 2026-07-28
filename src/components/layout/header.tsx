import { Suspense } from "react"
import { useTranslations } from "next-intl"

import { CartButton } from "@/components/cart/cart-button"
import { LocaleSwitcher } from "@/components/layout/locale-switcher"
import { NavLinks } from "@/components/layout/nav-links"
import { Link } from "@/i18n/navigation"
import { SITE } from "@/lib/constants"

export function Header() {
  const t = useTranslations("Header")
  const ta = useTranslations("A11y")
  const demoMode = process.env.DEMO_MODE === "1"

  return (
    <header className="sticky top-0 z-40">
      <div className="bg-topbar text-topbar-ink">
        <p className="mx-auto max-w-6xl px-4 py-1.5 text-center text-xs tracking-wide">
          {t("topbar")}
        </p>
      </div>
      <div className="border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-3">
          <Link href="/" className="font-display text-2xl font-semibold tracking-tight">
            {SITE.name}
            <span className="text-amber">.</span>
          </Link>
          <nav aria-label={ta("mainNav")} className="hidden items-center gap-6 text-sm sm:flex">
            <Suspense fallback={null}>
              <NavLinks />
            </Suspense>
            {demoMode && (
              <a
                href="/admin"
                className="rounded-full border border-dashed border-amber px-2.5 text-amber transition-colors hover:bg-amber hover:text-white"
              >
                Admin
              </a>
            )}
          </nav>
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <CartButton />
            <Link
              href="/frames"
              className="hidden rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90 sm:block"
            >
              {t("cta")}
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
