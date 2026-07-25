import { useTranslations } from "next-intl"

import { Link } from "@/i18n/navigation"
import { SITE } from "@/lib/constants"

export function Footer() {
  const t = useTranslations("Footer")

  return (
    <footer className="mt-auto border-t border-line bg-paper">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="font-display text-xl font-semibold">
            {SITE.name}
            <span className="text-amber">.</span>
          </p>
          <p className="mt-2 text-sm text-muted">{t("tagline", { city: SITE.city })}</p>
        </div>
        <nav aria-label="Footer" className="text-sm">
          <p className="mb-2 font-medium">{t("shop")}</p>
          <ul className="space-y-1 text-muted">
            <li>
              <Link href="/frames" className="hover:text-ink">
                {t("allFrames")}
              </Link>
            </li>
            <li>
              <Link href="/frames?featured=1" className="hover:text-ink">
                {t("bestsellers")}
              </Link>
            </li>
          </ul>
        </nav>
        <div className="text-sm text-muted">
          <p className="mb-2 font-medium text-ink">{t("contact")}</p>
          <p>{SITE.city}</p>
          <p>{SITE.phone}</p>
          <p>{SITE.instagram}</p>
        </div>
      </div>
      <div className="border-t border-line py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} {SITE.fullName}. {t("rights")}
      </div>
    </footer>
  )
}
