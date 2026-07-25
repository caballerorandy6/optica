import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"

import { FrameCard } from "@/components/catalog/frame-card"
import { FrameGallery } from "@/components/product/frame-gallery"
import { Link } from "@/i18n/navigation"
import { getFrameBySlug, getFrames } from "@/lib/catalog"
import { formatPrice } from "@/lib/format"

type Params = Promise<{ locale: string; slug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params
  const [t, frame] = await Promise.all([
    getTranslations({ locale, namespace: "Product" }),
    getFrameBySlug(slug),
  ])
  if (!frame) return { title: t("notFound") }
  return {
    title: `${frame.name} — ${formatPrice(frame.priceCents)}`,
    description:
      frame.description ||
      t("metaDescription", { name: frame.name, count: frame.variants.length }),
  }
}

export default async function FramePage({ params }: { params: Params }) {
  const { slug } = await params
  const [t, ta, tm, frame] = await Promise.all([
    getTranslations("Product"),
    getTranslations("A11y"),
    getTranslations("Materials"),
    getFrameBySlug(slug),
  ])
  if (!frame) notFound()

  const materialKey = frame.material?.toLowerCase()
  const materialName =
    materialKey && tm.has(materialKey) ? tm(materialKey) : frame.material

  const collection = frame.categories.find((c) => c.slug !== "new-releases")
  const { frames: related } = collection
    ? await getFrames({ collection: collection.slug })
    : { frames: [] }
  const relatedFrames = related.filter((f) => f.id !== frame.id).slice(0, 4)

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <nav aria-label={ta("breadcrumb")} className="mb-6 text-sm text-muted">
        <Link href="/frames" className="hover:text-ink">
          {t("framesCrumb")}
        </Link>
        {collection && (
          <>
            {" / "}
            <Link href={`/frames?collection=${collection.slug}`} className="hover:text-ink">
              {collection.name}
            </Link>
          </>
        )}
        {" / "}
        <span className="text-ink">{frame.name}</span>
      </nav>

      <FrameGallery
        product={{
          id: frame.id,
          slug: frame.slug,
          name: frame.name,
          priceCents: frame.priceCents,
        }}
        images={frame.images}
        variants={frame.variants}
      >
        <div className="mb-6">
          {collection && (
            <p className="text-xs uppercase tracking-widest text-muted">{collection.name}</p>
          )}
          <h1 className="mt-1 font-display text-4xl font-medium tracking-tight">
            {frame.name}
          </h1>
          <p className="mt-3 text-2xl">{formatPrice(frame.priceCents)}</p>
          {materialName && (
            <p className="mt-1 text-sm text-muted">
              {t("material", { material: materialName })}
            </p>
          )}
          {frame.description && (
            <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted">
              {frame.description}
            </p>
          )}
        </div>
      </FrameGallery>

      {relatedFrames.length > 0 && collection && (
        <section className="mt-16">
          <h2 className="mb-5 font-display text-2xl font-medium">
            {t("moreFrom", { collection: collection.name })}
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {relatedFrames.map((f) => (
              <FrameCard key={f.id} frame={f} />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
