import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { CartView } from "@/components/cart/cart-view"

type Params = Promise<{ locale: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Cart" })
  return { title: t("title") }
}

export default async function CartPage() {
  const t = await getTranslations("Cart")

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <h1 className="mb-8 font-display text-4xl font-medium tracking-tight">{t("title")}</h1>
      <CartView />
    </main>
  )
}
