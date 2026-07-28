import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { ClearCart } from "@/components/cart/clear-cart"
import { Link } from "@/i18n/navigation"
import { prisma } from "@/lib/prisma"
import { formatOrderNumber } from "@/lib/shipping"
import { getStripe } from "@/lib/stripe"

type Params = Promise<{ locale: string }>
type SearchParams = Promise<{ session_id?: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Checkout" })
  return { title: t("successTitle"), robots: { index: false, follow: false } }
}

async function getPaidOrder(sessionId: string) {
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId)
    if (session.payment_status !== "paid") return null
    return prisma.order.findUnique({
      where: { stripeSessionId: session.id },
      select: { number: true, email: true },
    })
  } catch {
    return null
  }
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  params: Params
  searchParams: SearchParams
}) {
  const { session_id } = await searchParams
  const [t, order] = await Promise.all([
    getTranslations("Checkout"),
    session_id ? getPaidOrder(session_id) : null,
  ])

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <ClearCart />
      <div className="flex size-16 items-center justify-center rounded-full bg-accent text-3xl text-accent-ink">
        ✓
      </div>
      <h1 className="mt-6 font-display text-4xl font-medium tracking-tight">
        {t("successTitle")}
      </h1>
      {order ? (
        <>
          <p className="mt-3 max-w-md text-muted-ink">
            {t("successOrder", { number: formatOrderNumber(order.number) })}
            {order.email && ` ${t("successEmail", { email: order.email })}`}
          </p>
          <Link
            href={`/track?order=${1000 + order.number}&email=${encodeURIComponent(order.email)}`}
            className="mt-2 text-sm text-accent underline underline-offset-4"
          >
            {t("trackCta")}
          </Link>
        </>
      ) : (
        <p className="mt-3 max-w-md text-muted-ink">{t("successGeneric")}</p>
      )}
      <p className="mt-2 max-w-md text-sm text-muted-ink">{t("successRxNote")}</p>
      <Link
        href="/frames"
        className="mt-8 rounded-full bg-accent px-6 py-3 font-medium text-accent-ink transition-opacity hover:opacity-90"
      >
        {t("backToShop")}
      </Link>
    </main>
  )
}
