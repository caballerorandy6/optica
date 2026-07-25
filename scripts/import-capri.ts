/**
 * Importador del catálogo de Capri Optics (WooCommerce Store API pública).
 *
 * - Trae categorías y los ~578 productos con variantes de color, medidas e imágenes.
 * - Los productos se importan como published=false y priceCents=0:
 *   el admin decide qué publica y a qué precio de venta.
 * - Re-ejecutable: usa upsert por capriId, no duplica.
 *
 * Uso: npm run import:capri
 */
import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

const BASE = 'https://caprioptics.com/wp-json/wc/store/v1'
const DELAY_MS = 600 // cortesía: pausa entre requests al servidor de Capri

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function fetchJson<T>(url: string, tries = 3): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'OpticaCatalogSync/1.0' },
      })
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`HTTP ${res.status}`)
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`)
      return (await res.json()) as T
    } catch (err) {
      if (attempt >= tries) throw err
      await sleep(2000 * attempt)
    }
  }
}

type CapriTerm = { id: number; name: string; slug: string }
type CapriAttribute = { name: string; taxonomy: string | null; terms: CapriTerm[] }
type CapriImage = { src: string; alt: string }
type CapriCategory = { id: number; name: string; slug: string; count: number }
type CapriProduct = {
  id: number
  name: string
  slug: string
  sku: string
  description: string
  short_description: string
  images: CapriImage[]
  categories: { id: number; name: string; slug: string }[]
  attributes: CapriAttribute[]
  variations: { id: number; attributes: { name: string; value: string }[] }[]
}

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

function attrTerms(p: CapriProduct, taxonomy: string): CapriTerm[] {
  return p.attributes.find((a) => a.taxonomy === taxonomy)?.terms ?? []
}

/** Busca la imagen cuyo nombre de archivo menciona el color (ej. "DC407 Black.jpg"). */
function imageForColor(images: CapriImage[], colorName: string): string | undefined {
  const needle = colorName.toLowerCase().replace(/[^a-z0-9]+/g, '')
  return images.find((img) => {
    const file = decodeURIComponent(img.src.split('/').pop() ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
    return file.includes(needle)
  })?.src
}

async function importCategories() {
  const cats = await fetchJson<CapriCategory[]>(`${BASE}/products/categories`)
  for (const c of cats) {
    await prisma.category.upsert({
      where: { capriId: c.id },
      update: { name: c.name, slug: c.slug },
      create: { capriId: c.id, name: c.name, slug: c.slug },
    })
  }
  console.log(`Categorías: ${cats.length}`)
  return cats.length
}

async function importProducts() {
  let page = 1
  let imported = 0
  for (;;) {
    const url = `${BASE}/products?per_page=100&page=${page}`
    const products = await fetchJson<CapriProduct[]>(url)
    if (products.length === 0) break

    for (const p of products) {
      const sku = p.sku?.trim() || `capri-${p.id}`
      const sizeTerm = attrTerms(p, 'pa_size')[0]?.name ?? null
      const colors = attrTerms(p, 'pa_color')
      const material = attrTerms(p, 'pa_material')[0]?.name ?? null

      const product = await prisma.product.upsert({
        where: { capriId: p.id },
        update: {
          name: p.name,
          slug: p.slug,
          sku,
          material,
          description: stripHtml(p.short_description || p.description || ''),
        },
        create: {
          capriId: p.id,
          name: p.name,
          slug: p.slug,
          sku,
          material,
          description: stripHtml(p.short_description || p.description || ''),
        },
      })

      await prisma.product.update({
        where: { id: product.id },
        data: {
          categories: {
            set: [],
            connect: p.categories
              .map((c) => ({ capriId: c.id }))
              .filter(Boolean) as { capriId: number }[],
          },
        },
      })

      // imágenes: reemplazo completo para reflejar el estado actual de Capri
      await prisma.productImage.deleteMany({ where: { productId: product.id } })
      await prisma.productImage.createMany({
        data: p.images.map((img, i) => ({
          productId: product.id,
          url: img.src,
          alt: img.alt || `${p.name}`,
          position: i,
        })),
      })

      for (const color of colors) {
        await prisma.variant.upsert({
          where: { productId_colorSlug: { productId: product.id, colorSlug: color.slug } },
          update: {
            color: color.name,
            size: sizeTerm,
            imageUrl: imageForColor(p.images, color.name) ?? p.images[0]?.src ?? null,
          },
          create: {
            productId: product.id,
            color: color.name,
            colorSlug: color.slug,
            size: sizeTerm,
            imageUrl: imageForColor(p.images, color.name) ?? p.images[0]?.src ?? null,
          },
        })
      }
      imported++
    }

    console.log(`Página ${page}: ${products.length} productos (total ${imported})`)
    if (products.length < 100) break
    page++
    await sleep(DELAY_MS)
  }
  return imported
}

async function main() {
  console.log('Importando catálogo de Capri Optics…')
  const started = Date.now()
  await importCategories()
  await sleep(DELAY_MS)
  const count = await importProducts()
  const [total, variants, images] = await Promise.all([
    prisma.product.count(),
    prisma.variant.count(),
    prisma.productImage.count(),
  ])
  console.log(
    `Listo en ${((Date.now() - started) / 1000).toFixed(1)}s — ` +
      `${count} procesados. DB: ${total} productos, ${variants} variantes, ${images} imágenes.`,
  )
}

main()
  .catch((err) => {
    console.error('Error en la importación:', err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
