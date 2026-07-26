"use client"

import { useEffect } from "react"

import { useCart } from "@/components/cart/cart-context"

/** Vacía el carrito al llegar a la página de éxito del pago. */
export function ClearCart() {
  const { clear } = useCart()
  useEffect(() => {
    clear()
  }, [clear])
  return null
}
