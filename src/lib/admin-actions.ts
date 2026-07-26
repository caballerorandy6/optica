"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"

import { ADMIN_COOKIE, verifySessionToken } from "@/lib/admin-session"
import { prisma } from "@/lib/prisma"

/** Las server actions son endpoints públicos: cada una re-verifica la sesión. */
async function requireAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_COOKIE)?.value
  if (!token || !(await verifySessionToken(token))) redirect("/admin/login")
}

const updateProductSchema = z.object({
  id: z.string().min(1),
  published: z.boolean().optional(),
  featured: z.boolean().optional(),
  priceCents: z.number().int().min(0).max(500_000).optional(),
})

export async function updateProduct(
  input: z.infer<typeof updateProductSchema>,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()
  const parsed = updateProductSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Datos inválidos" }
  const { id, ...data } = parsed.data

  // no publicar sin precio: la tienda vendería a $0
  if (data.published === true) {
    const product = await prisma.product.findUnique({ where: { id } })
    const price = data.priceCents ?? product?.priceCents ?? 0
    if (price <= 0) return { ok: false, error: "Ponle precio antes de publicar" }
  }

  await prisma.product.update({ where: { id }, data })
  revalidatePath("/admin/products")
  return { ok: true }
}

const shipOrderSchema = z.object({
  id: z.string().min(1),
  carrier: z.enum(["USPS", "UPS", "FEDEX", "LOCAL"]),
  trackingNumber: z.string().trim().max(60),
})

/** Pagado → Enviado, con paquetería y guía. Entrega local no exige guía. */
export async function shipOrder(
  input: z.infer<typeof shipOrderSchema>,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()
  const parsed = shipOrderSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Datos inválidos" }
  const { id, carrier, trackingNumber } = parsed.data

  if (carrier !== "LOCAL" && trackingNumber.length < 6) {
    return { ok: false, error: "Ingresa el número de guía de la paquetería" }
  }

  const { count } = await prisma.order.updateMany({
    where: { id, status: "PAID" },
    data: {
      status: "SHIPPED",
      carrier,
      trackingNumber: trackingNumber || null,
      shippedAt: new Date(),
    },
  })
  if (count === 0) return { ok: false, error: "El pedido ya no está en 'Pagado'" }

  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } })
  if (order) {
    const { sendOrderShipped } = await import("@/lib/email")
    await sendOrderShipped(order)
  }

  revalidatePath("/admin/orders")
  return { ok: true }
}

/** Enviado → Entregado (o Pagado → Entregado si se entregó en mano). */
export async function markDelivered(id: string): Promise<{ ok: boolean }> {
  await requireAdmin()
  const { count } = await prisma.order.updateMany({
    where: { id, status: { in: ["PAID", "SHIPPED"] } },
    data: { status: "FULFILLED", fulfilledAt: new Date() },
  })
  revalidatePath("/admin/orders")
  return { ok: count === 1 }
}

/** Deshacer: Entregado → Enviado (si tenía guía) o Pagado; Enviado → Pagado. */
export async function undoOrderStep(id: string): Promise<{ ok: boolean }> {
  await requireAdmin()
  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) return { ok: false }

  if (order.status === "FULFILLED") {
    await prisma.order.update({
      where: { id },
      data: {
        status: order.shippedAt ? "SHIPPED" : "PAID",
        fulfilledAt: null,
      },
    })
  } else if (order.status === "SHIPPED") {
    await prisma.order.update({
      where: { id },
      data: { status: "PAID", carrier: null, trackingNumber: null, shippedAt: null },
    })
  } else {
    return { ok: false }
  }
  revalidatePath("/admin/orders")
  return { ok: true }
}

/**
 * Cancela un pedido cobrado: reembolso real en Stripe, estado REFUNDED
 * y restauración del stock que el webhook había descontado.
 */
export async function cancelAndRefund(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()

  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } })
  if (!order) return { ok: false, error: "Pedido no encontrado" }
  if (order.status !== "PAID" && order.status !== "SHIPPED") {
    return { ok: false, error: "Solo se reembolsan pedidos pagados o enviados" }
  }
  if (!order.stripeSessionId) return { ok: false, error: "Sin sesión de Stripe asociada" }

  const { getStripe } = await import("@/lib/stripe")
  const stripe = getStripe()

  const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId)
  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id
  if (!paymentIntent) return { ok: false, error: "No se encontró el pago en Stripe" }

  let refundId: string
  try {
    const refund = await stripe.refunds.create({ payment_intent: paymentIntent })
    refundId = refund.id
  } catch (err) {
    console.error("Stripe refund failed:", err)
    return { ok: false, error: "Stripe rechazó el reembolso. Revisa el dashboard." }
  }

  // el dinero ya se devolvió: registrar estado y reponer stock juntos
  await prisma.$transaction([
    prisma.order.update({
      where: { id },
      data: { status: "REFUNDED", refundedAt: new Date(), stripeRefundId: refundId },
    }),
    ...order.items
      .filter((i) => i.variantId)
      .map((i) =>
        prisma.variant.update({
          where: { id: i.variantId! },
          data: { stock: { increment: i.quantity } },
        }),
      ),
  ])

  revalidatePath("/admin/orders")
  return { ok: true }
}
