import type { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"

export const FRAMES_PER_PAGE = 12

export type CatalogFilters = {
  collection?: string
  material?: string
  color?: string
  featured?: boolean
  page?: number
}

const publishedFrames = (filters: CatalogFilters): Prisma.ProductWhereInput => ({
  published: true,
  ...(filters.featured && { featured: true }),
  ...(filters.collection && { categories: { some: { slug: filters.collection } } }),
  ...(filters.material && { material: { equals: filters.material, mode: "insensitive" } }),
  ...(filters.color && { variants: { some: { colorSlug: filters.color } } }),
})

export async function getFrames(filters: CatalogFilters) {
  const where = publishedFrames(filters)
  const page = Math.max(1, filters.page ?? 1)

  const [frames, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ featured: "desc" }, { name: "asc" }],
      skip: (page - 1) * FRAMES_PER_PAGE,
      take: FRAMES_PER_PAGE,
      include: {
        images: { orderBy: { position: "asc" }, take: 1 },
        variants: { orderBy: { color: "asc" } },
        categories: { select: { name: true, slug: true } },
      },
    }),
    prisma.product.count({ where }),
  ])

  return { frames, total, page, pages: Math.ceil(total / FRAMES_PER_PAGE) }
}

export type FrameListItem = Awaited<ReturnType<typeof getFrames>>["frames"][number]

export async function getFilterOptions() {
  const [collections, materials, colors] = await Promise.all([
    prisma.category.findMany({
      where: { slug: { not: "case" }, products: { some: { published: true } } },
      orderBy: { name: "asc" },
      select: {
        name: true,
        slug: true,
        _count: { select: { products: { where: { published: true } } } },
      },
    }),
    prisma.product.findMany({
      where: { published: true, material: { not: null } },
      distinct: ["material"],
      select: { material: true },
      orderBy: { material: "asc" },
    }),
    prisma.variant.findMany({
      where: { product: { published: true } },
      distinct: ["colorSlug"],
      select: { color: true, colorSlug: true },
      orderBy: { color: "asc" },
    }),
  ])

  return {
    collections,
    materials: materials.flatMap((m) => (m.material ? [m.material] : [])),
    colors,
  }
}

export async function getFrameBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug, published: true },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: { orderBy: { color: "asc" } },
      categories: { select: { name: true, slug: true } },
    },
  })
}
