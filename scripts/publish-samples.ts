/**
 * Publica una muestra del catálogo con precios de PRUEBA para desarrollo.
 *
 * - Elige hasta 40 monturas repartidas entre las colecciones más grandes,
 *   solo productos con imagen y al menos una variante de color.
 * - Precio determinista por material (metal > acetato > resto) — placeholder
 *   hasta que el cliente defina precios reales desde el admin.
 * - Da stock a las variantes y marca 8 monturas como destacadas para el home.
 * - Re-ejecutable: siempre parte del mismo criterio, no acumula.
 *
 * Uso: npm run publish:samples
 */
import 'dotenv/config'
import { prisma } from '../src/lib/prisma'

const SAMPLE_SIZE = 40
const FEATURED_COUNT = 8
const PER_CATEGORY = 5

function testPriceCents(material: string | null, capriId: number | null): number {
  const base = /metal|titanium|stainless/i.test(material ?? '') ? 9500 : 7900
  // variación estable por producto para que el grid no se vea uniforme
  const bump = ((capriId ?? 0) % 4) * 500
  return base + bump
}

async function main() {
  const categories = await prisma.category.findMany({
    // "case" son estuches, no monturas — fuera de la muestra del catálogo
    where: { slug: { not: 'case' } },
    orderBy: { products: { _count: 'desc' } },
    include: { _count: { select: { products: true } } },
  })

  const picked = new Map<string, { id: string; material: string | null; capriId: number | null }>()

  for (const cat of categories) {
    if (picked.size >= SAMPLE_SIZE) break
    const products = await prisma.product.findMany({
      where: {
        categories: { some: { id: cat.id } },
        images: { some: {} },
        variants: { some: {} },
      },
      orderBy: { capriId: 'asc' },
      take: PER_CATEGORY,
      select: { id: true, material: true, capriId: true },
    })
    for (const p of products) {
      if (picked.size >= SAMPLE_SIZE) break
      picked.set(p.id, p)
    }
  }

  // limpia el estado anterior para que el script sea idempotente
  await prisma.product.updateMany({
    where: { published: true },
    data: { published: false, featured: false, priceCents: 0 },
  })

  const ids = [...picked.keys()]
  for (const [i, id] of ids.entries()) {
    const p = picked.get(id)!
    await prisma.product.update({
      where: { id },
      data: {
        published: true,
        featured: i < FEATURED_COUNT,
        priceCents: testPriceCents(p.material, p.capriId),
      },
    })
  }
  await prisma.variant.updateMany({
    where: { productId: { in: ids }, stock: 0 },
    data: { stock: 10 },
  })

  const published = await prisma.product.count({ where: { published: true } })
  const featured = await prisma.product.count({ where: { featured: true } })
  console.log(`Publicados: ${published} (destacados: ${featured}) con precios de prueba.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
