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
      className="group flex flex-col overflow-hidden rounded-2xl border border-card-line bg-white/60 transition-shadow hover:shadow-card dark:bg-white/5"
    >
      <div className="relative aspect-[4/3] bg-white">
        {image ? (
          <Image
            src={image.url}
            alt={image.alt || frame.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="frame-photo object-contain p-4 transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-ink">
            {t("photoSoon")}
          </div>
        )}
        {frame.featured && (
          <span className="absolute left-3 top-3 rounded-full bg-amber px-2.5 py-0.5 text-xs font-medium text-white">
            {t("bestseller")}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        {collection && (
          <p className="text-xs uppercase tracking-widest text-muted-ink">{collection.name}</p>
        )}
        <p className="font-display text-lg leading-snug">{frame.name}</p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <p className="font-medium">{formatPrice(frame.priceCents)}</p>
          <div className="flex items-center gap-1" aria-hidden="true">
            {frame.variants.slice(0, 4).map((v) => (
              <span
                key={v.id}
                title={tc.has(v.colorSlug) ? tc(v.colorSlug) : v.color}
                className="size-3.5 rounded-full border border-card-line"
                style={{ background: swatchBackground(v.colorSlug) }}
              />
            ))}
            {frame.variants.length > 4 && (
              <span className="text-xs text-muted-ink">+{frame.variants.length - 4}</span>
            )}
          </div>
        </div>
        <p className="sr-only">{t("colorsAvailable", { count: frame.variants.length })}</p>
      </div>
    </Link>
  )
}
