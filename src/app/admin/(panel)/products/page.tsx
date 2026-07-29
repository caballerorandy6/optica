import Image from "next/image"
import Link from "next/link"

import { BulkPriceDialog } from "@/components/admin/bulk-price-dialog"
import { ProductRowControls } from "@/components/admin/product-row-controls"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  buildProductsWhere,
  parseProductsFilter,
  type ProductsFilter,
} from "@/lib/admin-products-filter"
import { prisma } from "@/lib/prisma"

const PER_PAGE = 50

type SearchParams = Promise<{
  q?: string
  status?: string
  collection?: string
  page?: string
}>

function adminHref(f: ProductsFilter, page: number): string {
  const params = new URLSearchParams()
  if (f.q) params.set("q", f.q)
  if (f.status !== "all") params.set("status", f.status)
  if (f.collection) params.set("collection", f.collection)
  if (page > 1) params.set("page", String(page))
  const qs = params.toString()
  return qs ? `/admin/products?${qs}` : "/admin/products"
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  const filter = parseProductsFilter(sp)
  const page = Math.max(1, Number(sp.page) || 1)
  const where = buildProductsWhere(filter)

  const [products, total, collections] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ published: "desc" }, { name: "asc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        images: { orderBy: { position: "asc" }, take: 1 },
        categories: { select: { name: true } },
        _count: { select: { variants: true } },
      },
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({
      where: { slug: { not: "case" } },
      orderBy: { name: "asc" },
      select: { name: true, slug: true },
    }),
  ])
  const pages = Math.ceil(total / PER_PAGE)

  const activeCollection = collections.find((c) => c.slug === filter.collection)
  const filterLabel =
    [
      filter.status === "published"
        ? "publicadas"
        : filter.status === "draft"
          ? "sin publicar"
          : "todas",
      activeCollection && `colección ${activeCollection.name}`,
      filter.q && `búsqueda "${filter.q}"`,
    ]
      .filter(Boolean)
      .join(", ") || "todas"

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Productos</h1>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? "montura" : "monturas"}
          </p>
          <BulkPriceDialog filter={filter} total={total} filterLabel={filterLabel} />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form action="/admin/products" className="flex flex-wrap gap-2">
          <Input
            type="search"
            name="q"
            defaultValue={filter.q}
            placeholder="Buscar por nombre o SKU…"
            className="w-56"
          />
          <select
            name="collection"
            defaultValue={filter.collection}
            className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
          >
            <option value="">Todas las colecciones</option>
            {collections.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          {filter.status !== "all" && (
            <input type="hidden" name="status" value={filter.status} />
          )}
          <Button type="submit" variant="secondary">
            Filtrar
          </Button>
        </form>
        <div className="flex gap-1">
          {(
            [
              ["all", "Todas"],
              ["published", "Publicadas"],
              ["draft", "Sin publicar"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              asChild
              size="sm"
              variant={filter.status === value ? "default" : "outline"}
            >
              <Link href={adminHref({ ...filter, status: value }, 1)}>{label}</Link>
            </Button>
          ))}
        </div>
      </div>

      <ul className="divide-y rounded-lg border bg-card">
        {products.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center gap-4 p-3 transition-colors hover:bg-muted/60"
          >
            <div className="relative size-14 shrink-0 overflow-hidden rounded-md border bg-white">
              {p.images[0] && (
                <Image
                  src={p.images[0].url}
                  alt={p.name}
                  fill
                  sizes="56px"
                  className="object-contain p-1"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {p.name} <span className="text-xs text-muted-foreground">({p.sku})</span>
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {p.categories.map((c) => c.name).join(" · ")} — {p._count.variants}{" "}
                {p._count.variants === 1 ? "color" : "colores"}
              </p>
            </div>
            {p.featured && <Badge variant="secondary">Destacada</Badge>}
            <ProductRowControls
              id={p.id}
              name={p.name}
              priceCents={p.priceCents}
              published={p.published}
              featured={p.featured}
            />
          </li>
        ))}
      </ul>

      {pages > 1 && (
        <nav aria-label="Paginación" className="mt-6 flex items-center justify-center gap-3">
          {page > 1 && (
            <Button asChild variant="outline" size="sm">
              <Link href={adminHref(filter, page - 1)}>← Anterior</Link>
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            Página {page} de {pages}
          </span>
          {page < pages && (
            <Button asChild variant="outline" size="sm">
              <Link href={adminHref(filter, page + 1)}>Siguiente →</Link>
            </Button>
          )}
        </nav>
      )}
    </div>
  )
}
