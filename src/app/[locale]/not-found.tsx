import { useTranslations } from "next-intl"

import { Link } from "@/i18n/navigation"

export default function NotFound() {
  const t = useTranslations("NotFound")

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <p className="font-display text-7xl font-medium text-accent">404</p>
      <h1 className="mt-4 font-display text-3xl font-medium">{t("title")}</h1>
      <p className="mt-2 max-w-md text-muted-ink">{t("message")}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-accent px-6 py-3 font-medium text-accent-ink transition-opacity hover:opacity-90"
        >
          {t("cta")}
        </Link>
        <Link
          href="/frames"
          className="rounded-full border border-line px-6 py-3 font-medium transition-colors hover:border-accent"
        >
          {t("ctaFrames")}
        </Link>
      </div>
    </main>
  )
}
