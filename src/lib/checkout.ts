"use server"

import { headers } from "next/headers"
import { z } from "zod"

import { LENS_OPTIONS } from "@/lib/constants"
import { prisma } from "@/lib/prisma"
import { getStripe } from "@/lib/stripe"
import { rxSchema } from "@/lib/validations"

const checkoutSchema = z.object({
  locale: z.enum(["es", "en"]),
  items: z
    .array(
      z.object({
        variantId: z.string().min(1),
        lensOption: z.enum(["FRAME_ONLY", "BASIC", "ANTI_REFLECTIVE", "BLUE_LIGHT"]),
        qty: z.number().int().min(1).max(10),
        rx: rxSchema.nullable(),
      }),
    )
    .min(1)
    .max(30),
})

export type CheckoutInput = z.infer<typeof checkoutSchema>
type CheckoutResult = { url: string } | { error: "INVALID" | "UNAVAILABLE" | "OUT_OF_STOCK" }

const lensLabel: Record<string, { es: string; en: string }> = {
  FRAME_ONLY: { es: "Solo montura", en: "Frame only" },
  BASIC: { es: "Micas básicas", en: "Basic lenses" },
  ANTI_REFLECTIVE: { es: "Antirreflejo", en: "Anti-reflective" },
  BLUE_LIGHT: { es: "Filtro de luz azul", en: "Blue light filter" },
}

export async function createCheckoutSession(input: CheckoutInput): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(input)
  if (!parsed.success) return { error: "INVALID" }
  const { locale, items } = parsed.data

  const variants = await prisma.variant.findMany({
    where: { id: { in: items.map((i) => i.variantId) } },
    include: { product: true },
  })
  const byId = new Map(variants.map((v) => [v.id, v]))

  // precios y disponibilidad SIEMPRE desde la base, nunca del cliente
  const lines = []
  for (const item of items) {
    const variant = byId.get(item.variantId)
    if (!variant || !variant.product.published) return { error: "UNAVAILABLE" }
    if (variant.stock < item.qty) return { error: "OUT_OF_STOCK" }
    const lensPrice = LENS_OPTIONS.find((o) => o.id === item.lensOption)?.priceCents ?? 0
    lines.push({
      variant,
      item,
      unitCents: variant.product.priceCents + lensPrice,
    })
  }
  const totalCents = lines.reduce((sum, l) => sum + l.unitCents * l.item.qty, 0)

  // el pedido nace PENDING con la receta guardada; el webhook lo marca PAID
  const order = await prisma.order.create({
    data: {
      email: "",
      name: "",
      totalCents,
      items: {
        create: lines.map(({ variant, item, unitCents }) => ({
          productId: variant.productId,
          variantId: variant.id,
          nameSnapshot: `${variant.product.name} · ${variant.color}`,
          priceCents: unitCents,
          quantity: item.qty,
          lensOption: item.lensOption,
          rxData: item.rx ?? undefined,
        })),
      },
    },
  })

  const h = await headers()
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`
  const prefix = locale === "es" ? "" : `/${locale}`

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    locale,
    line_items: lines.map(({ variant, item, unitCents }) => ({
      quantity: item.qty,
      price_data: {
        currency: "usd",
        unit_amount: unitCents,
        product_data: {
          name: `${variant.product.name} — ${variant.color}`,
          description: lensLabel[item.lensOption][locale],
          ...(variant.imageUrl && { images: [encodeURI(variant.imageUrl)] }),
        },
      },
    })),
    metadata: { orderId: order.id },
    client_reference_id: order.id,
    success_url: `${origin}${prefix}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}${prefix}/cart`,
  })

  await prisma.order.update({
    where: { id: order.id },
    data: { stripeSessionId: session.id },
  })

  if (!session.url) return { error: "UNAVAILABLE" }
  return { url: session.url }
}
