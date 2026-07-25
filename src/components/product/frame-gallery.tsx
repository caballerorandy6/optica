"use client"

import { useState } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"

import { swatchBackground } from "@/lib/colors"

type GalleryImage = { id: string; url: string; alt: string }
type GalleryVariant = {
  id: string
  color: string
  colorSlug: string
  size: string | null
  stock: number
  imageUrl: string | null
}

export function FrameGallery({
  name,
  images,
  variants,
  children,
}: {
  name: string
  images: GalleryImage[]
  variants: GalleryVariant[]
  children?: React.ReactNode
}) {
  const t = useTranslations("Product")
  const [variant, setVariant] = useState(variants[0] ?? null)
  const [imageOverride, setImageOverride] = useState<string | null>(null)

  const mainSrc = imageOverride ?? variant?.imageUrl ?? images[0]?.url ?? null

  function selectVariant(v: GalleryVariant) {
    setVariant(v)
    setImageOverride(null)
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-card-line bg-white">
          {mainSrc ? (
            <Image
              src={mainSrc}
              alt={t("defaultAlt", { name, color: variant?.color ?? "—" })}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="frame-photo object-contain p-6"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted">
              {t("photoSoon")}
            </div>
          )}
        </div>
        {images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {images.map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setImageOverride(img.url)}
                aria-label={t("viewPhoto", { alt: img.alt })}
                className={`relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-lg border bg-white ${
                  mainSrc === img.url ? "border-accent" : "border-card-line"
                }`}
              >
                <Image
                  src={img.url}
                  alt=""
                  fill
                  sizes="80px"
                  className="frame-photo object-contain p-1"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        {children}
        {variants.length > 0 && (
          <fieldset>
            <legend className="mb-2 text-xs font-medium uppercase tracking-widest text-muted">
              {t("colorLabel", { color: variant?.color ?? "—" })}
            </legend>
            <div className="flex flex-wrap gap-2">
              {variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => selectVariant(v)}
                  aria-pressed={variant?.id === v.id}
                  aria-label={t("colorOption", { color: v.color })}
                  title={v.color}
                  className={
                    variant?.id === v.id
                      ? "rounded-full ring-2 ring-accent ring-offset-2 ring-offset-paper"
                      : "rounded-full transition-transform hover:scale-110"
                  }
                >
                  <span
                    className="block size-8 rounded-full border border-card-line"
                    style={{ background: swatchBackground(v.colorSlug) }}
                  />
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {variant?.size && (
          <p className="mt-4 text-sm text-muted">
            {t("size")} <span className="font-medium text-ink">{variant.size}</span>{" "}
            {t("sizeUnits")}
          </p>
        )}
        {variant && variant.stock <= 3 && variant.stock > 0 && (
          <p className="mt-2 text-sm text-amber">{t("lowStock", { count: variant.stock })}</p>
        )}
        {variant && variant.stock === 0 && (
          <p className="mt-2 text-sm text-muted">{t("outOfStock")}</p>
        )}

        <div className="mt-6 space-y-3">
          <button
            type="button"
            disabled
            className="w-full cursor-not-allowed rounded-full bg-accent px-6 py-3 font-medium text-accent-ink opacity-60"
          >
            {t("cta")}
          </button>
          <p className="text-center text-xs text-muted">{t("ctaNote")}</p>
        </div>
      </div>
    </div>
  )
}
