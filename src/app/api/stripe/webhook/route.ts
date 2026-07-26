import { NextResponse } from "next/server"
import type Stripe from "stripe"

import { prisma } from "@/lib/prisma"
import { getStripe } from "@/lib/stripe"

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set")
    return NextResponse.json({ error: "not configured" }, { status: 500 })
  }

  const signature = request.headers.get("stripe-signature")
  if (!signature) return NextResponse.json({ error: "missing signature" }, { status: 400 })

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret)
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object
    const orderId = session.metadata?.orderId
    if (!orderId) return NextResponse.json({ received: true })

    // idempotente: solo la transición PENDING → PAID descuenta stock
    const { count } = await prisma.order.updateMany({
      where: { id: orderId, status: "PENDING" },
      data: {
        status: "PAID",
        email: session.customer_details?.email ?? "",
        name: session.customer_details?.name ?? "",
        phone: session.customer_details?.phone ?? null,
      },
    })

    if (count === 1) {
      const items = await prisma.orderItem.findMany({
        where: { orderId, variantId: { not: null } },
        select: { variantId: true, quantity: true },
      })
      for (const item of items) {
        await prisma.variant.updateMany({
          where: { id: item.variantId!, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        })
      }
    }
  }

  if (event.type === "checkout.session.expired") {
    const orderId = event.data.object.metadata?.orderId
    if (orderId) {
      await prisma.order.updateMany({
        where: { id: orderId, status: "PENDING" },
        data: { status: "CANCELLED" },
      })
    }
  }

  return NextResponse.json({ received: true })
}
