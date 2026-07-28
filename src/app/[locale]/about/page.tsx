import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { Link } from "@/i18n/navigation"
import { SITE } from "@/lib/constants"
import { pageAlternates } from "@/lib/seo"

type Params = Promise<{ locale: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "About" })
  return {
    title: t("metaTitle"),
    description: t("metaDescription", { name: SITE.fullName, city: SITE.city }),
    alternates: pageAlternates(locale, "/about"),
  }
}

export default async function AboutPage() {
  const t = await getTranslations("About")

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-amber">
        {t("eyebrow")}
      </p>
      <h1 className="mt-3 font-display text-5xl font-medium tracking-tight">
        {t("titleStart")} <em className="text-accent">{t("titleAccent")}</em>
      </h1>
      <div className="mt-6 space-y-4 leading-relaxed text-muted-ink">
        <p>{t("p1", { name: SITE.fullName, city: SITE.city })}</p>
        <p>{t("p2")}</p>
      </div>
      <div className="mt-8 rounded-2xl border border-line p-6 text-sm">
        <p className="font-medium">{t("visitTitle")}</p>
        <p className="mt-2 text-muted-ink">
          {SITE.city} · {SITE.phone} · {SITE.instagram}
        </p>
      </div>
      <Link
        href="/frames"
        className="mt-8 inline-block rounded-full bg-accent px-6 py-3 font-medium text-accent-ink transition-opacity hover:opacity-90"
      >
        {t("cta")}
      </Link>
    </main>
  )
}
