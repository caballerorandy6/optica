import Image from "next/image"
import { useTranslations } from "next-intl"

import { Link } from "@/i18n/navigation"
import type { FrameListItem } from "@/lib/catalog"
import { swatchBackground } from "@/lib/colors"
import { formatPrice } from "@/lib/format"

export function FrameCard({ frame }: { frame: FrameListItem }) {
  const t = useTranslations("Card")
  const tc = useTranslations("Colors")
  const image = frame.images[0]
  const collection = frame.categories.find((c) => c.slug !== "new-releases")

  return (
    <Link
      href={`/frames/${frame.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-card"
    >
      <div className="relative aspect-[4/3] border-b border-line bg-white">
        {image ? (
          <Image
            src={image.url}
            alt={image.alt || frame.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="frame-photo object-contain p-4 transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-neutral-500">
            {t("photoSoon")}
          </div>
        )}
        {frame.featured && (
          <span className="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-ink shadow-sm">
            {t("bestseller")}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        {collection && (
          <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-ink">
            {collection.name}
          </p>
        )}
        <p className="font-display text-lg font-medium leading-snug text-ink">{frame.name}</p>
        <div className="mt-auto flex items-center justify-between pt-3">
          <p className="text-base font-semibold text-ink">{formatPrice(frame.priceCents)}</p>
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {frame.variants.slice(0, 4).map((v) => (
              <span
                key={v.id}
                title={tc.has(v.colorSlug) ? tc(v.colorSlug) : v.color}
                className="size-4 rounded-full shadow-[inset_0_0_0_1.5px_var(--mira-surface)] ring-1 ring-line"
                style={{ background: swatchBackground(v.colorSlug) }}
              />
            ))}
            {frame.variants.length > 4 && (
              <span className="text-xs font-medium text-muted-ink">
                +{frame.variants.length - 4}
              </span>
            )}
          </div>
        </div>
        <p className="sr-only">{t("colorsAvailable", { count: frame.variants.length })}</p>
      </div>
    </Link>
  )
}
