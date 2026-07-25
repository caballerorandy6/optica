"use client"

import { useTranslations } from "next-intl"

import { useCart } from "@/components/cart/cart-context"
import { Link } from "@/i18n/navigation"

export function CartButton() {
  const { count } = useCart()
  const t = useTranslations("Cart")

  return (
    <Link
      href="/cart"
      aria-label={t("openCart", { count })}
      className="relative rounded-full border border-line p-2 transition-colors hover:border-accent"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="size-5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 3h1.9l.4 2m0 0L6.1 13.6a1.5 1.5 0 0 0 1.47 1.15h8.9a1.5 1.5 0 0 0 1.46-1.13l1.82-7.12H4.55m2.2 12.4a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm9.5 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"
        />
      </svg>
      {count > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-amber text-[11px] font-semibold text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  )
}
