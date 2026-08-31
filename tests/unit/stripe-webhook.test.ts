/**
 * Tests del webhook de Stripe — el punto donde entra el dinero real.
 *
 * Un webhook es una llamada HTTP que Stripe nos hace cuando el cliente paga.
 * Riesgos que cubren estos tests:
 *  - Falsificación: cualquiera puede hacer POST al endpoint; solo la firma
 *    criptográfica de Stripe distingue un evento real de uno inventado.
 *  - Duplicados: Stripe reintenta si no respondemos a tiempo; descontar
 *    stock dos veces por el mismo pedido sería un bug de inventario.
 *
 * El route handler es una función normal: la importamos, le pasamos un
 * Request fabricado y verificamos el Response y los efectos en los mocks.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { prismaMock, stripeMock, emailMock, revalidatePathMock } = vi.hoisted(() => ({
  prismaMock: {
    order: { updateMany: vi.fn(), findUnique: vi.fn() },
    orderItem: { findMany: vi.fn() },
    variant: { updateMany: vi.fn() },
  },
  stripeMock: { webhooks: { constructEvent: vi.fn() } },
  emailMock: {
    sendOrderConfirmation: vi.fn(),
    sendNewOrderNotification: vi.fn(),
  },
  revalidatePathMock: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/stripe", () => ({ getStripe: () => stripeMock }))
vi.mock("@/lib/email", () => emailMock)
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }))

import { POST } from "@/app/api/stripe/webhook/route"

/** Simula el POST que Stripe manda al endpoint. */
function stripeRequest(headers: Record<string, string> = { "stripe-signature": "sig_ok" }) {
  return new Request("http://localhost:3000/api/stripe/webhook", {
    method: "POST",
    body: "{}",
    headers,
  })
}

// null = evento sin orderId (undefined activaría el valor por defecto)
function paidEvent(orderId: string | null = "order_1") {
  return {
    type: "checkout.session.completed",
    data: {
      object: {
        metadata: orderId ? { orderId } : {},
        customer_details: { email: "cliente@test.com", name: "Ana", phone: null },
      },
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test")
  // camino feliz por defecto; cada test sobreescribe lo que necesita
  stripeMock.webhooks.constructEvent.mockReturnValue(paidEvent())
  prismaMock.order.updateMany.mockResolvedValue({ count: 1 })
  prismaMock.orderItem.findMany.mockResolvedValue([
    { variantId: "var_1", quantity: 2 },
    { variantId: "var_2", quantity: 1 },
  ])
  prismaMock.variant.updateMany.mockResolvedValue({ count: 1 })
  prismaMock.order.findUnique.mockResolvedValue({
    id: "order_1",
    items: [{ lensOption: "FRAME_ONLY", rxData: null }],
  })
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("webhook — seguridad", () => {
  it("responde 500 si falta STRIPE_WEBHOOK_SECRET (mal configurado)", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "")
    const res = await POST(stripeRequest())
    expect(res.status).toBe(500)
  })

  it("responde 400 si el POST no trae firma", async () => {
    const res = await POST(stripeRequest({}))
    expect(res.status).toBe(400)
    expect(prismaMock.order.updateMany).not.toHaveBeenCalled()
  })

  it("responde 400 si la firma es inválida (evento falsificado)", async () => {
    stripeMock.webhooks.constructEvent.mockImplementation(() => {
      throw new Error("bad signature")
    })
    const res = await POST(stripeRequest())
    expect(res.status).toBe(400)
    expect(prismaMock.order.updateMany).not.toHaveBeenCalled()
  })
})

describe("webhook — pago completado", () => {
  it("marca PAID, guarda datos del cliente, descuenta stock y envía emails", async () => {
    const res = await POST(stripeRequest())
    expect(res.status).toBe(200)

    // transición PENDING → PAID con los datos que Stripe recolectó
    expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
      where: { id: "order_1", status: "PENDING" },
      data: expect.objectContaining({
        status: "PAID",
        email: "cliente@test.com",
        name: "Ana",
      }),
    })

    // stock: un decrement por cada línea del pedido
    expect(prismaMock.variant.updateMany).toHaveBeenCalledTimes(2)
    expect(prismaMock.variant.updateMany).toHaveBeenCalledWith({
      where: { id: "var_1", stock: { gte: 2 } },
      data: { stock: { decrement: 2 } },
    })

    // emails al cliente y al admin
    expect(emailMock.sendOrderConfirmation).toHaveBeenCalledOnce()
    expect(emailMock.sendNewOrderNotification).toHaveBeenCalledOnce()

    // el stock cambió → purgar las páginas cacheadas (ISR de 30 días)
    expect(revalidatePathMock).toHaveBeenCalledWith("/", "layout")
  })

  it("es idempotente: un evento repetido NO descuenta stock otra vez", async () => {
    // count 0 = el pedido ya no estaba PENDING (este evento ya se procesó)
    prismaMock.order.updateMany.mockResolvedValue({ count: 0 })

    const res = await POST(stripeRequest())

    // responde 200 para que Stripe deje de reintentar…
    expect(res.status).toBe(200)
    // …pero no repite ningún efecto secundario
    expect(prismaMock.variant.updateMany).not.toHaveBeenCalled()
    expect(emailMock.sendOrderConfirmation).not.toHaveBeenCalled()
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })

  it("ignora eventos sin orderId en metadata (no son nuestros)", async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue(paidEvent(null))
    const res = await POST(stripeRequest())
    expect(res.status).toBe(200)
    expect(prismaMock.order.updateMany).not.toHaveBeenCalled()
  })

  it("avisa al admin cuando falta la fórmula (rx pendiente)", async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: "order_1",
      items: [{ lensOption: "BASIC", rxData: null }], // micas sin receta
    })
    await POST(stripeRequest())
    // segundo argumento pendingRx = true
    expect(emailMock.sendNewOrderNotification).toHaveBeenCalledWith(
      expect.anything(),
      true,
    )
  })
})

describe("webhook — sesión expirada", () => {
  it("cancela el pedido PENDING cuando el cliente abandona el checkout", async () => {
    stripeMock.webhooks.constructEvent.mockReturnValue({
      type: "checkout.session.expired",
      data: { object: { metadata: { orderId: "order_9" } } },
    })

    const res = await POST(stripeRequest())
    expect(res.status).toBe(200)
    expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
      where: { id: "order_9", status: "PENDING" },
      data: { status: "CANCELLED" },
    })
    // nunca hubo pago: no toca stock ni manda emails
    expect(prismaMock.variant.updateMany).not.toHaveBeenCalled()
  })
})
