import type { MetadataRoute } from "next"

import { prisma } from "@/lib/prisma"
import { SITE_URL } from "@/lib/seo"

function entry(
  path: string,
  lastModified: Date | undefined,
  priority: number,
): MetadataRoute.Sitemap[number] {
  return {
    url: `${SITE_URL}${path === "/" ? "" : path}` || SITE_URL,
    lastModified,
    priority,
    alternates: {
      languages: {
        es: `${SITE_URL}${path === "/" ? "" : path}` || SITE_URL,
        en: `${SITE_URL}/en${path === "/" ? "" : path}`,
      },
    },
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await prisma.product.findMany({
    where: { published: true },
    select: { slug: true, updatedAt: true },
    orderBy: { slug: "asc" },
  })

  return [
    entry("/", undefined, 1),
    entry("/frames", undefined, 0.9),
    entry("/about", undefined, 0.5),
    entry("/track", undefined, 0.3),
    ...products.map((p) => entry(`/frames/${p.slug}`, p.updatedAt, 0.7)),
  ]
}
