import type { Prisma } from "@prisma/client"

export type ProductsFilter = {
  q: string
  status: "all" | "published" | "draft"
  collection: string
}

export function parseProductsFilter(sp: {
  q?: string
  status?: string
  collection?: string
}): ProductsFilter {
  return {
    q: sp.q?.trim() ?? "",
    status: sp.status === "published" || sp.status === "draft" ? sp.status : "all",
    collection: sp.collection?.trim() ?? "",
  }
}

export function buildProductsWhere(f: ProductsFilter): Prisma.ProductWhereInput {
  return {
    ...(f.q && {
      OR: [
        { name: { contains: f.q, mode: "insensitive" } },
        { sku: { contains: f.q, mode: "insensitive" } },
      ],
    }),
    ...(f.status === "published" && { published: true }),
    ...(f.status === "draft" && { published: false }),
    ...(f.collection && { categories: { some: { slug: f.collection } } }),
  }
}
