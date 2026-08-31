/**
 * Tests de las server actions del admin que tocan dinero o inventario.
 *
 * Novedad respecto a las otras suites: estas funciones exigen sesión de
 * admin (leen la cookie y verifican el JWT). En los tests mockeamos esa
 * capa como "sesión válida" para probar la lógica de negocio; la protección
 * real de la cookie la prueba el proxy en producción.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const { prismaMock, stripeMock, revalidatePathMock } = vi.hoisted(() => ({
  prismaMock: {
    product: { update: vi.fn(), findUnique: vi.fn() },
    order: { findUnique: vi.fn(), update: vi.fn() },
    variant: { update: vi.fn() },
    $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops)),
  },
  stripeMock: {
    checkout: { sessions: { retrieve: vi.fn() } },
    refunds: { create: vi.fn() },
  },
  revalidatePathMock: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
vi.mock("@/lib/stripe", () => ({ getStripe: () => stripeMock }))
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }))
// sesión de admin válida: cookie presente + token verificado
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "token_valido" }) }),
}))
vi.mock("@/lib/admin-session", () => ({
  ADMIN_COOKIE: "mira-admin",
  verifySessionToken: vi.fn(async () => true),
}))
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT") // así se comporta el redirect real de Next
  }),
}))

import { cancelAndRefund, updateProduct } from "@/lib/admin-actions"

function refundableOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "order_1",
    status: "PAID",
    stripeSessionId: "cs_test_1",
    items: [
      { variantId: "var_1", quantity: 2 },
      { variantId: null, quantity: 1 }, // línea sin variante (no repone stock)
    ],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.order.findUnique.mockResolvedValue(refundableOrder())
  stripeMock.checkout.sessions.retrieve.mockResolvedValue({ payment_intent: "pi_1" })
  stripeMock.refunds.create.mockResolvedValue({ id: "re_1" })
})

describe("cancelAndRefund", () => {
  it("reembolsa en Stripe, marca REFUNDED y repone el stock", async () => {
    const result = await cancelAndRefund("order_1")
    expect(result).toEqual({ ok: true })

    // el reembolso se pide sobre el pago original de esa sesión
    expect(stripeMock.refunds.create).toHaveBeenCalledWith({ payment_intent: "pi_1" })

    // estado + stock se actualizan juntos, en una transacción
    expect(prismaMock.$transaction).toHaveBeenCalledOnce()
    expect(prismaMock.order.update).toHaveBeenCalledWith({
      where: { id: "order_1" },
      data: expect.objectContaining({ status: "REFUNDED", stripeRefundId: "re_1" }),
    })
    // solo la línea con variante repone stock (la de variantId null se ignora)
    expect(prismaMock.variant.update).toHaveBeenCalledTimes(1)
    expect(prismaMock.variant.update).toHaveBeenCalledWith({
      where: { id: "var_1" },
      data: { stock: { increment: 2 } },
    })
  })

  it("solo reembolsa pedidos PAID o SHIPPED", async () => {
    prismaMock.order.findUnique.mockResolvedValue(refundableOrder({ status: "PENDING" }))
    const result = await cancelAndRefund("order_1")
    expect(result.ok).toBe(false)
    expect(stripeMock.refunds.create).not.toHaveBeenCalled()
  })

  it("si Stripe rechaza el reembolso, NO marca REFUNDED ni toca stock", async () => {
    stripeMock.refunds.create.mockRejectedValue(new Error("card_declined"))
    // silenciar el console.error esperado del catch
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})

    const result = await cancelAndRefund("order_1")

    expect(result.ok).toBe(false)
    // el dinero NO se devolvió → la base debe quedar intacta
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it("falla con claridad si el pedido no tiene sesión de Stripe", async () => {
    prismaMock.order.findUnique.mockResolvedValue(
      refundableOrder({ stripeSessionId: null }),
    )
    const result = await cancelAndRefund("order_1")
    expect(result.ok).toBe(false)
    expect(stripeMock.refunds.create).not.toHaveBeenCalled()
  })
})

describe("updateProduct — regla 'no publicar sin precio'", () => {
  it("impide publicar una montura con precio 0 (se vendería gratis)", async () => {
    prismaMock.product.findUnique.mockResolvedValue({ id: "prod_1", priceCents: 0 })
    const result = await updateProduct({ id: "prod_1", published: true })
    expect(result.ok).toBe(false)
    expect(prismaMock.product.update).not.toHaveBeenCalled()
  })

  it("publica normalmente cuando el producto ya tiene precio", async () => {
    prismaMock.product.findUnique.mockResolvedValue({ id: "prod_1", priceCents: 5000 })
    const result = await updateProduct({ id: "prod_1", published: true })
    expect(result).toEqual({ ok: true })
    expect(prismaMock.product.update).toHaveBeenCalledWith({
      where: { id: "prod_1" },
      data: { published: true },
    })
    // purga el panel Y la tienda pública (ISR de 30 días)
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/products")
    expect(revalidatePathMock).toHaveBeenCalledWith("/", "layout")
  })

  it("permite publicar si el precio viene en la misma edición", async () => {
    prismaMock.product.findUnique.mockResolvedValue({ id: "prod_1", priceCents: 0 })
    const result = await updateProduct({ id: "prod_1", published: true, priceCents: 4500 })
    expect(result).toEqual({ ok: true })
  })
})
