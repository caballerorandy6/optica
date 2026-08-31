/**
 * Tests de createCheckoutSession — la función que arma el pedido y la sesión
 * de Stripe. Lo crítico: los precios SIEMPRE salen de la base de datos, nunca
 * de lo que manda el navegador (un cliente malicioso podría inventar precios).
 *
 * Técnica: vi.mock() intercepta los imports de prisma/stripe/headers y los
 * sustituye por objetos falsos que controlamos desde cada test.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

// vi.hoisted: estas variables se crean ANTES que los vi.mock de abajo
// (vitest "iza" los vi.mock al inicio del archivo al compilarlo)
const { prismaMock, stripeMock } = vi.hoisted(() => ({
  prismaMock: {
    variant: { findMany: vi.fn() },
    order: { create: vi.fn(), update: vi.fn() },
  },
  stripeMock: {
    checkout: { sessions: { create: vi.fn() } },
  },
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/stripe", () => ({ getStripe: () => stripeMock }))
vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({ host: "localhost:3000", "x-forwarded-proto": "http" }),
}))

import { createCheckoutSession, type CheckoutInput } from "@/lib/checkout"

/** Una variante como la devolvería Prisma (con su producto incluido). */
function fakeVariant(overrides: Record<string, unknown> = {}) {
  return {
    id: "var_1",
    productId: "prod_1",
    color: "Negro",
    stock: 5,
    imageUrl: null,
    product: { id: "prod_1", name: "Aviator 7710", priceCents: 5000, published: true },
    ...overrides,
  }
}

function input(overrides: Partial<CheckoutInput["items"][number]> = {}): CheckoutInput {
  return {
    locale: "es",
    items: [{ variantId: "var_1", lensOption: "FRAME_ONLY", qty: 1, rx: null, ...overrides }],
  }
}

beforeEach(() => {
  // cada test arranca con mocks limpios y respuestas felices por defecto
  vi.clearAllMocks()
  prismaMock.variant.findMany.mockResolvedValue([fakeVariant()])
  prismaMock.order.create.mockResolvedValue({ id: "order_1" })
  prismaMock.order.update.mockResolvedValue({})
  stripeMock.checkout.sessions.create.mockResolvedValue({
    id: "cs_test_1",
    url: "https://checkout.stripe.com/pay/cs_test_1",
  })
})

describe("createCheckoutSession — validación de entrada", () => {
  it("rechaza un carrito vacío", async () => {
    const result = await createCheckoutSession({ locale: "es", items: [] })
    expect(result).toEqual({ error: "INVALID" })
    // ni siquiera tocó la base
    expect(prismaMock.variant.findMany).not.toHaveBeenCalled()
  })

  it("rechaza una receta con cilindro pero sin eje (no se puede fabricar)", async () => {
    const result = await createCheckoutSession(
      input({
        lensOption: "BASIC",
        rx: {
          od: { sph: -1.5, cyl: -0.75 }, // falta axis
          os: { sph: -1.25 },
          pd: 62,
        },
      }) as CheckoutInput,
    )
    expect(result).toEqual({ error: "INVALID" })
  })

  it("rechaza cantidades imposibles (0 o negativas)", async () => {
    const result = await createCheckoutSession(input({ qty: 0 }))
    expect(result).toEqual({ error: "INVALID" })
  })
})

describe("createCheckoutSession — disponibilidad", () => {
  it("rechaza productos despublicados aunque el carrito los tenga", async () => {
    prismaMock.variant.findMany.mockResolvedValue([
      fakeVariant({ product: { id: "prod_1", name: "X", priceCents: 5000, published: false } }),
    ])
    expect(await createCheckoutSession(input())).toEqual({ error: "UNAVAILABLE" })
  })

  it("rechaza variantes que ya no existen en la base", async () => {
    prismaMock.variant.findMany.mockResolvedValue([])
    expect(await createCheckoutSession(input())).toEqual({ error: "UNAVAILABLE" })
  })

  it("rechaza cuando piden más unidades que el stock", async () => {
    prismaMock.variant.findMany.mockResolvedValue([fakeVariant({ stock: 1 })])
    expect(await createCheckoutSession(input({ qty: 2 }))).toEqual({ error: "OUT_OF_STOCK" })
  })
})

describe("createCheckoutSession — precios desde la base (anti-manipulación)", () => {
  it("calcula montura + mica desde la BD y se lo manda igual a Stripe", async () => {
    // montura $50.00 (BD) + antirreflejo $60.00 (constants) = $110.00 × 2
    const result = await createCheckoutSession(
      input({ lensOption: "ANTI_REFLECTIVE", qty: 2 }),
    )

    // 1) el pedido se guardó con el total correcto
    const orderData = prismaMock.order.create.mock.calls[0][0].data
    expect(orderData.totalCents).toBe((5000 + 6000) * 2)
    expect(orderData.items.create[0]).toMatchObject({
      priceCents: 11000,
      quantity: 2,
      lensOption: "ANTI_REFLECTIVE",
    })

    // 2) Stripe cobra exactamente lo mismo que registramos
    const session = stripeMock.checkout.sessions.create.mock.calls[0][0]
    expect(session.line_items[0].price_data.unit_amount).toBe(11000)
    expect(session.line_items[0].quantity).toBe(2)

    // 3) el webhook podrá encontrar el pedido: va en metadata
    expect(session.metadata).toEqual({ orderId: "order_1" })

    // 4) guardamos el id de sesión para poder reembolsar después
    expect(prismaMock.order.update).toHaveBeenCalledWith({
      where: { id: "order_1" },
      data: { stripeSessionId: "cs_test_1" },
    })

    expect(result).toEqual({ url: "https://checkout.stripe.com/pay/cs_test_1" })
  })

  it("FRAME_ONLY no suma nada al precio de la montura", async () => {
    await createCheckoutSession(input({ lensOption: "FRAME_ONLY" }))
    expect(prismaMock.order.create.mock.calls[0][0].data.totalCents).toBe(5000)
  })

  it("las URLs de retorno respetan el locale (español bajo /es, inglés en la raíz)", async () => {
    await createCheckoutSession({ ...input(), locale: "es" })
    let session = stripeMock.checkout.sessions.create.mock.calls[0][0]
    expect(session.success_url).toContain("/es/checkout/success")
    expect(session.cancel_url).toContain("/es/cart")

    await createCheckoutSession({ ...input(), locale: "en" })
    session = stripeMock.checkout.sessions.create.mock.calls[1][0]
    expect(session.success_url).not.toContain("/en/")
    expect(session.cancel_url).not.toContain("/en/")
  })
})
