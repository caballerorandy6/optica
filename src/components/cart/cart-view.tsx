"use client"

import Image from "next/image"
import { useTranslations } from "next-intl"

import {
  type CartItem,
  lineTotalCents,
  lensPriceCents,
  useCart,
} from "@/components/cart/cart-context"
import { Link } from "@/i18n/navigation"
import { formatPrice } from "@/lib/format"

function CartLine({ item }: { item: CartItem }) {
  const t = useTranslations("Cart")
  const tl = useTranslations("Lens")
  const tc = useTranslations("Colors")
  const { setQty, removeItem } = useCart()

  const colorName = tc.has(item.colorSlug) ? tc(item.colorSlug) : item.color
  const lensExtra = lensPriceCents(item.lensOption)

  return (
    <li className="flex gap-4 py-5">
      <Link
        href={`/frames/${item.slug}`}
        className="relative block aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-xl border border-card-line bg-white"
      >
        {item.imageUrl && (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="112px"
            className="frame-photo object-contain p-2"
          />
        )}
      </Link>
      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link href={`/frames/${item.slug}`} className="font-display text-lg">
              {item.name}
            </Link>
            <p className="text-sm text-muted">{colorName}</p>
            <p className="text-sm text-muted">
              {tl(item.lensOption)}
              {lensExtra > 0 && ` (+${formatPrice(lensExtra)})`}
            </p>
            {item.lensOption !== "FRAME_ONLY" && (
              <p className="text-xs text-amber">
                {item.rx ? t("rxIncluded") : t("rxLater")}
              </p>
            )}
          </div>
          <p className="font-medium">{formatPrice(lineTotalCents(item))}</p>
        </div>
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-center gap-1 rounded-full border border-line">
            <button
              type="button"
              aria-label={t("decrease")}
              onClick={() => setQty(item, item.qty - 1)}
              className="px-3 py-1 text-lg leading-none hover:text-accent"
            >
              −
            </button>
            <span aria-label={t("qty")} className="min-w-6 text-center text-sm">
              {item.qty}
            </span>
            <button
              type="button"
              aria-label={t("increase")}
              onClick={() => setQty(item, item.qty + 1)}
              className="px-3 py-1 text-lg leading-none hover:text-accent"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={() => removeItem(item)}
            className="text-sm text-muted underline underline-offset-4 hover:text-ink"
          >
            {t("remove")}
          </button>
        </div>
      </div>
    </li>
  )
}

export function CartView() {
  const t = useTranslations("Cart")
  const { items, subtotalCents } = useCart()

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-line p-12 text-center">
        <p className="font-display text-2xl">{t("empty")}</p>
        <Link
          href="/frames"
          className="mt-6 inline-block rounded-full bg-accent px-6 py-3 font-medium text-accent-ink transition-opacity hover:opacity-90"
        >
          {t("emptyCta")}
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
      <ul className="divide-y divide-line">
        {items.map((item) => (
          <CartLine
            key={`${item.variantId}:${item.lensOption}:${item.rx ? "rx" : "no"}`}
            item={item}
          />
        ))}
      </ul>

      <aside className="h-fit rounded-2xl border border-line p-6">
        <div className="flex items-center justify-between">
          <p className="font-medium">{t("subtotal")}</p>
          <p className="font-display text-2xl">{formatPrice(subtotalCents)}</p>
        </div>
        <p className="mt-1 text-xs text-muted">{t("shippingNote")}</p>
        <button
          type="button"
          disabled
          className="mt-5 w-full cursor-not-allowed rounded-full bg-accent px-6 py-3 font-medium text-accent-ink opacity-60"
        >
          {t("checkout")}
        </button>
        <p className="mt-2 text-center text-xs text-muted">{t("checkoutSoon")}</p>
      </aside>
    </div>
  )
}
