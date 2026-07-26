import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { CatalogFilters, catalogHref } from "@/components/catalog/catalog-filters"
import { FrameCard } from "@/components/catalog/frame-card"
import { Link } from "@/i18n/navigation"
import { type CatalogFilters as Filters, getFilterOptions, getFrames } from "@/lib/catalog"

type Params = Promise<{ locale: string }>
type SearchParams = Promise<Record<string, string | string[] | undefined>>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Catalog" })
  return { title: t("metaTitle"), description: t("metaDescription") }
}

function parseFilters(params: Record<string, string | string[] | undefined>): Filters {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const page = Number(first(params.page)) || 1
  return {
    collection: first(params.collection),
    material: first(params.material),
    color: first(params.color),
    featured: first(params.featured) === "1",
    page,
  }
}

export default async function FramesPage({
  searchParams,
}: {
  params: Params
  searchParams: SearchParams
}) {
  const filters = parseFilters(await searchParams)
  const [t, ta, { frames, total, page, pages }, options] = await Promise.all([
    getTranslations("Catalog"),
    getTranslations("A11y"),
    getFrames(filters),
    getFilterOptions(),
  ])

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <header className="mb-8">
        <h1 className="font-display text-4xl font-medium tracking-tight">
          {filters.featured ? t("bestsellers") : t("title")}
        </h1>
        <p className="mt-2 text-muted-ink">{t("count", { count: total })}</p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
        <CatalogFilters filters={filters} options={options} />

        <div>
          {frames.length === 0 ? (
            <div className="rounded-2xl border border-line p-10 text-center">
              <p className="font-display text-xl">{t("emptyTitle")}</p>
              <p className="mt-2 text-sm text-muted-ink">
                {t("emptyHint")}{" "}
                <Link href="/frames" className="text-accent underline underline-offset-4">
                  {t("browseAll")}
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {frames.map((frame) => (
                <FrameCard key={frame.id} frame={frame} />
              ))}
            </div>
          )}

          {pages > 1 && (
            <nav
              aria-label={ta("pagination")}
              className="mt-10 flex items-center justify-center gap-2"
            >
              {page > 1 && (
                <Link
                  href={catalogHref(filters, { page: page - 1 })}
                  className="rounded-full border border-line px-4 py-1.5 text-sm hover:border-accent"
                >
                  {t("prev")}
                </Link>
              )}
              <span className="px-2 text-sm text-muted-ink">{t("pageOf", { page, pages })}</span>
              {page < pages && (
                <Link
                  href={catalogHref(filters, { page: page + 1 })}
                  className="rounded-full border border-line px-4 py-1.5 text-sm hover:border-accent"
                >
                  {t("next")}
                </Link>
              )}
            </nav>
          )}
        </div>
      </div>
    </main>
  )
}
