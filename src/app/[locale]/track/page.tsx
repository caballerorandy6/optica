import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { SITE } from "@/lib/constants"
import { prisma } from "@/lib/prisma"
import { pageAlternates } from "@/lib/seo"
import { CARRIERS, formatOrderNumber, isCarrier, trackingUrl } from "@/lib/shipping"

type Params = Promise<{ locale: string }>
type SearchParams = Promise<{ order?: string; email?: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Track" })
  return { title: t("metaTitle"), alternates: pageAlternates(locale, "/track") }
}

async function findOrder(orderInput: string, email: string) {
  const digits = Number(orderInput.replace(/\D/g, ""))
  if (!digits || !email) return null
  // el número visible es 1000 + number; aceptar ambos formatos
  const number = digits > 1000 ? digits - 1000 : digits
  const order = await prisma.order.findUnique({ where: { number } })
  if (!order || order.email.toLowerCase() !== email.trim().toLowerCase()) return null
  return order
}

function Step({
  done,
  label,
  detail,
}: {
  done: boolean
  label: string
  detail?: React.ReactNode
}) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs ${
          done ? "bg-accent text-accent-ink" : "border border-line text-muted-ink"
        }`}
      >
        {done ? "✓" : ""}
      </span>
      <div>
        <p className={done ? "font-medium" : "text-muted-ink"}>{label}</p>
        {detail && <div className="text-sm text-muted-ink">{detail}</div>}
      </div>
    </li>
  )
}

export default async function TrackPage({
  searchParams,
}: {
  params: Params
  searchParams: SearchParams
}) {
  const sp = await searchParams
  const t = await getTranslations("Track")
  const searched = Boolean(sp.order && sp.email)
  const order = searched ? await findOrder(sp.order!, sp.email!) : null

  const dateFmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

  const carrierLabel =
    order?.carrier && isCarrier(order.carrier) ? CARRIERS[order.carrier].label : order?.carrier
  const track = order ? trackingUrl(order.carrier, order.trackingNumber) : null
  const reachedPaid =
    order && ["PAID", "SHIPPED", "FULFILLED"].includes(order.status)

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-14">
      <h1 className="font-display text-4xl font-medium tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-muted-ink">{t("intro")}</p>

      <form method="get" className="mt-6 grid gap-3 sm:grid-cols-[1fr_1.5fr_auto]">
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-ink">
            {t("orderLabel")}
          </span>
          <input
            name="order"
            required
            defaultValue={sp.order ?? ""}
            placeholder="#1002"
            className="rounded-lg border border-line bg-transparent px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-ink">
            {t("emailLabel")}
          </span>
          <input
            name="email"
            type="email"
            required
            defaultValue={sp.email ?? ""}
            placeholder="tu@email.com"
            className="rounded-lg border border-line bg-transparent px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="self-end rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-opacity hover:opacity-90"
        >
          {t("submit")}
        </button>
      </form>

      {searched && !order && (
        <p role="alert" className="mt-8 rounded-xl border border-line p-4 text-sm">
          {t("notFound")}
        </p>
      )}

      {order && (
        <section className="mt-10 rounded-2xl border border-line p-6">
          <h2 className="font-display text-2xl font-medium">
            {t("orderTitle", { number: formatOrderNumber(order.number) })}
          </h2>

          {order.status === "PENDING" && (
            <p className="mt-3 text-sm text-muted-ink">{t("pendingNote")}</p>
          )}
          {order.status === "CANCELLED" && (
            <p className="mt-3 text-sm text-muted-ink">{t("cancelledNote")}</p>
          )}
          {order.status === "REFUNDED" && (
            <p className="mt-3 text-sm text-muted-ink">{t("refundedNote")}</p>
          )}

          {order.status !== "CANCELLED" && order.status !== "REFUNDED" && (
            <ol className="mt-6 space-y-5">
              <Step done label={t("stepPlaced")} detail={dateFmt(order.createdAt)} />
              <Step done={Boolean(reachedPaid)} label={t("stepPaid")} />
              <Step
                done={["SHIPPED", "FULFILLED"].includes(order.status)}
                label={t("stepShipped")}
                detail={
                  order.shippedAt && carrierLabel ? (
                    <>
                      <p>
                        {t("shippedVia", { carrier: carrierLabel })} ·{" "}
                        {dateFmt(order.shippedAt)}
                      </p>
                      {track ? (
                        <a
                          href={track}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent underline underline-offset-4"
                        >
                          {t("trackPackage", { carrier: carrierLabel })}
                        </a>
                      ) : (
                        order.carrier === "LOCAL" && <p>{t("localDelivery")}</p>
                      )}
                    </>
                  ) : undefined
                }
              />
              <Step
                done={order.status === "FULFILLED"}
                label={t("stepDelivered")}
                detail={order.fulfilledAt ? dateFmt(order.fulfilledAt) : undefined}
              />
            </ol>
          )}
        </section>
      )}

      <p className="mt-10 text-sm text-muted-ink">{t("help", { email: SITE.email })}</p>
    </main>
  )
}
