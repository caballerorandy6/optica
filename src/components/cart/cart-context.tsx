"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

import { LENS_OPTIONS, type LensOptionId } from "@/lib/constants"
import type { RxData } from "@/lib/validations"

export type CartItem = {
  productId: string
  variantId: string
  slug: string
  name: string
  color: string
  colorSlug: string
  imageUrl: string | null
  framePriceCents: number
  lensOption: LensOptionId
  /** null = solo montura o "envío la fórmula después" */
  rx: RxData | null
  qty: number
}

/** montura + color + micas + fórmula identifican una línea del carrito */
const lineKey = (i: Pick<CartItem, "variantId" | "lensOption" | "rx">) =>
  `${i.variantId}:${i.lensOption}:${i.rx ? JSON.stringify(i.rx) : "no-rx"}`

export function lensPriceCents(lensOption: LensOptionId): number {
  return LENS_OPTIONS.find((o) => o.id === lensOption)?.priceCents ?? 0
}

export function lineTotalCents(item: CartItem): number {
  return (item.framePriceCents + lensPriceCents(item.lensOption)) * item.qty
}

type CartContextValue = {
  items: CartItem[]
  count: number
  subtotalCents: number
  addItem: (item: Omit<CartItem, "qty">) => void
  setQty: (item: CartItem, qty: number) => void
  removeItem: (item: CartItem) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

const STORAGE_KEY = "mira-cart-v1"

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  // localStorage solo existe en el cliente: hidratar tras el mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setItems(JSON.parse(raw))
    } catch {
      // carrito corrupto: empezar vacío
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const addItem = useCallback((item: Omit<CartItem, "qty">) => {
    setItems((prev) => {
      const key = lineKey(item)
      const existing = prev.find((i) => lineKey(i) === key)
      if (existing) {
        return prev.map((i) => (lineKey(i) === key ? { ...i, qty: i.qty + 1 } : i))
      }
      return [...prev, { ...item, qty: 1 }]
    })
  }, [])

  const setQty = useCallback((item: CartItem, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((i) => lineKey(i) !== lineKey(item))
        : prev.map((i) => (lineKey(i) === lineKey(item) ? { ...i, qty } : i)),
    )
  }, [])

  const removeItem = useCallback((item: CartItem) => {
    setItems((prev) => prev.filter((i) => lineKey(i) !== lineKey(item)))
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((sum, i) => sum + i.qty, 0)
    const subtotalCents = items.reduce((sum, i) => sum + lineTotalCents(i), 0)
    return { items, count, subtotalCents, addItem, setQty, removeItem, clear }
  }, [items, addItem, setQty, removeItem, clear])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}
