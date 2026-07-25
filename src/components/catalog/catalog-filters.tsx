import { useTranslations } from "next-intl"

import { Link } from "@/i18n/navigation"
import type { CatalogFilters as Filters, getFilterOptions } from "@/lib/catalog"
import { swatchBackground } from "@/lib/colors"

type FilterOptions = Awaited<ReturnType<typeof getFilterOptions>>

export function catalogHref(filters: Filters, overrides: Partial<Filters>): string {
  const next = { ...filters, page: undefined, ...overrides }
  const params = new URLSearchParams()
  if (next.collection) params.set("collection", next.collection)
  if (next.material) params.set("material", next.material)
  if (next.color) params.set("color", next.color)
  if (next.featured) params.set("featured", "1")
  if (next.page && next.page > 1) params.set("page", String(next.page))
  const qs = params.toString()
  return qs ? `/frames?${qs}` : "/frames"
}

function Chip({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={
        active
          ? "rounded-full border border-accent bg-accent px-3 py-1 text-sm text-accent-ink"
          : "rounded-full border border-line px-3 py-1 text-sm text-muted transition-colors hover:border-accent hover:text-ink"
      }
    >
      {children}
    </Link>
  )
}

export function CatalogFilters({
  filters,
  options,
}: {
  filters: Filters
  options: FilterOptions
}) {
  const t = useTranslations("Catalog")
  const tc = useTranslations("Colors")
  const tm = useTranslations("Materials")
  const hasFilters =
    filters.collection || filters.material || filters.color || filters.featured

  return (
    <aside aria-label={t("filtersLabel")} className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted">
          {t("collection")}
        </p>
        <div className="flex flex-wrap gap-2">
          {options.collections.map((c) => {
            const active = filters.collection === c.slug
            return (
              <Chip
                key={c.slug}
                active={active}
                href={catalogHref(filters, { collection: active ? undefined : c.slug })}
              >
                {c.name} <span className="opacity-60">{c._count.products}</span>
              </Chip>
            )
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted">
          {t("material")}
        </p>
        <div className="flex flex-wrap gap-2">
          {options.materials.map((m) => {
            const active = filters.material?.toLowerCase() === m.toLowerCase()
            return (
              <Chip
                key={m}
                active={active}
                href={catalogHref(filters, { material: active ? undefined : m })}
              >
                {tm.has(m.toLowerCase()) ? tm(m.toLowerCase()) : m}
              </Chip>
            )
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted">
          {t("color")}
        </p>
        <div className="flex flex-wrap gap-2">
          {options.colors.map((c) => {
            const active = filters.color === c.colorSlug
            const colorName = tc.has(c.colorSlug) ? tc(c.colorSlug) : c.color
            return (
              <Link
                key={c.colorSlug}
                title={colorName}
                aria-label={t("colorFilter", { color: colorName })}
                aria-current={active ? "true" : undefined}
                href={catalogHref(filters, { color: active ? undefined : c.colorSlug })}
                className={
                  active
                    ? "rounded-full ring-2 ring-accent ring-offset-2 ring-offset-paper"
                    : "rounded-full transition-transform hover:scale-110"
                }
              >
                <span
                  className="block size-6 rounded-full border border-card-line"
                  style={{ background: swatchBackground(c.colorSlug) }}
                />
              </Link>
            )
          })}
        </div>
      </div>

      {hasFilters && (
        <Link
          href="/frames"
          className="inline-block text-sm text-accent underline underline-offset-4"
        >
          {t("clear")}
        </Link>
      )}
    </aside>
  )
}
