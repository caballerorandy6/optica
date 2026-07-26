import { Fragment } from "react"
import Link from "next/link"
import type { Prisma } from "@prisma/client"

import {
  CopyRxButton,
  DeliverButton,
  RefundDialog,
  ShipOrderDialog,
  UndoButton,
} from "@/components/admin/order-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatPrice } from "@/lib/format"
import { prisma } from "@/lib/prisma"
import { CARRIERS, formatOrderNumber, isCarrier, trackingUrl } from "@/lib/shipping"
import type { RxData } from "@/lib/validations"

const LENS_LABEL: Record<string, string> = {
  FRAME_ONLY: "Solo montura",
  BASIC: "Micas básicas",
  ANTI_REFLECTIVE: "Antirreflejo",
  BLUE_LIGHT: "Filtro de luz azul",
}

const FILTERS = [
  { key: "toship", label: "Por enviar" },
  { key: "shipped", label: "Enviados" },
  { key: "fulfilled", label: "Entregados" },
  { key: "all", label: "Todos" },
] as const

type FilterKey = (typeof FILTERS)[number]["key"]

const FILTER_WHERE: Record<FilterKey, Prisma.OrderWhereInput> = {
  toship: { status: "PAID" },
  shipped: { status: "SHIPPED" },
  fulfilled: { status: "FULFILLED" },
  all: {},
}

function rxLine(rx: RxData): string {
  const eye = (label: string, e: RxData["od"]) =>
    `${label}: SPH ${e.sph >= 0 ? "+" : ""}${e.sph.toFixed(2)}` +
    (e.cyl ? ` · CYL ${Number(e.cyl).toFixed(2)}` : "") +
    (e.axis ? ` · EJE ${e.axis}°` : "")
  return `${eye("OD", rx.od)}  |  ${eye("OI", rx.os)}  |  DP ${rx.pd} mm`
}

function ItemDato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </span>
  )
}

type SearchParams = Promise<{ filter?: string }>

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  const filter: FilterKey = FILTERS.some((f) => f.key === sp.filter)
    ? (sp.filter as FilterKey)
    : "toship"

  const [orders, counts] = await Promise.all([
    prisma.order.findMany({
      where: FILTER_WHERE[filter],
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { items: true },
    }),
    prisma.order.groupBy({ by: ["status"], _count: true }),
  ])
  const countOf = (s: string) => counts.find((c) => c.status === s)?._count ?? 0
  const filterCount: Record<FilterKey, number> = {
    toship: countOf("PAID"),
    shipped: countOf("SHIPPED"),
    fulfilled: countOf("FULFILLED"),
    all: counts.reduce((sum, c) => sum + c._count, 0),
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Pedidos</h1>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <Button
              key={f.key}
              asChild
              size="sm"
              variant={filter === f.key ? "default" : "outline"}
            >
              <Link
                href={f.key === "toship" ? "/admin/orders" : `/admin/orders?filter=${f.key}`}
              >
                {f.label} <span className="opacity-70">{filterCount[f.key]}</span>
              </Link>
            </Button>
          ))}
        </div>
      </div>

      {orders.length === 0 ? (
        <p className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          {filter === "toship" ? "Nada por enviar. 🎉" : "No hay pedidos en esta vista."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60 [&>th]:h-11 [&>th]:text-xs [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-wider [&>th]:text-muted-foreground">
                <TableHead className="w-20">Pedido</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-56">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const orderLabel = formatOrderNumber(order.number)
                const track = trackingUrl(order.carrier, order.trackingNumber)
                return (
                  <Fragment key={order.id}>
                    <TableRow className="border-b-0 hover:bg-transparent">
                      <TableCell className="pt-4 align-top font-semibold">
                        {orderLabel}
                      </TableCell>
                      <TableCell className="whitespace-nowrap pt-4 align-top text-muted-foreground">
                        {order.createdAt.toLocaleDateString("es-US", {
                          dateStyle: "medium",
                        })}
                      </TableCell>
                      <TableCell className="pt-4 align-top">
                        {order.name || <span className="text-muted-foreground">—</span>}
                        <span className="block text-xs">
                          {order.email && (
                            <a
                              href={`mailto:${order.email}`}
                              className="text-primary underline-offset-2 hover:underline"
                            >
                              {order.email}
                            </a>
                          )}
                          {order.phone && (
                            <>
                              {" · "}
                              <a
                                href={`tel:${order.phone}`}
                                className="text-primary underline-offset-2 hover:underline"
                              >
                                {order.phone}
                              </a>
                            </>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="pt-4 text-right align-top font-semibold">
                        {formatPrice(order.totalCents)}
                      </TableCell>
                      <TableCell className="pt-4 align-top">
                        <div className="flex flex-wrap items-center gap-2">
                          {order.status === "PAID" && (
                            <>
                              <ShipOrderDialog id={order.id} orderLabel={orderLabel} />
                              <DeliverButton id={order.id} />
                              <RefundDialog
                                id={order.id}
                                orderLabel={orderLabel}
                                totalCents={order.totalCents}
                              />
                            </>
                          )}
                          {order.status === "SHIPPED" && (
                            <>
                              <Badge>Enviado</Badge>
                              <DeliverButton id={order.id} />
                              <UndoButton id={order.id} />
                              <RefundDialog
                                id={order.id}
                                orderLabel={orderLabel}
                                totalCents={order.totalCents}
                              />
                            </>
                          )}
                          {order.status === "FULFILLED" && (
                            <>
                              <Badge variant="secondary">Entregado</Badge>
                              <UndoButton id={order.id} />
                            </>
                          )}
                          {order.status === "PENDING" && (
                            <Badge variant="outline">Pendiente de pago</Badge>
                          )}
                          {order.status === "CANCELLED" && (
                            <Badge variant="destructive">Cancelado</Badge>
                          )}
                          {order.status === "REFUNDED" && (
                            <Badge variant="destructive">Reembolsado</Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    <TableRow className="hover:bg-transparent">
                      <TableCell />
                      <TableCell colSpan={4} className="pb-4 pt-0">
                        {(order.status === "SHIPPED" || order.carrier) && (
                          <p className="mb-2 flex flex-wrap items-baseline gap-x-5 text-sm">
                            <ItemDato label="Envío">
                              {order.carrier && isCarrier(order.carrier)
                                ? CARRIERS[order.carrier].label
                                : order.carrier}
                            </ItemDato>
                            {order.trackingNumber && (
                              <ItemDato label="Guía">
                                {track ? (
                                  <a
                                    href={track}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono text-xs text-primary underline-offset-2 hover:underline"
                                  >
                                    {order.trackingNumber} ↗
                                  </a>
                                ) : (
                                  <span className="font-mono text-xs">
                                    {order.trackingNumber}
                                  </span>
                                )}
                              </ItemDato>
                            )}
                            {order.shippedAt && (
                              <ItemDato label="Enviado el">
                                {order.shippedAt.toLocaleDateString("es-US", {
                                  dateStyle: "medium",
                                })}
                              </ItemDato>
                            )}
                          </p>
                        )}
                        <ul className="space-y-2">
                          {order.items.map((item) => (
                            <li
                              key={item.id}
                              className="flex flex-wrap items-baseline gap-x-5 gap-y-1.5 text-sm"
                            >
                              <ItemDato label="Cant.">{item.quantity}</ItemDato>
                              <ItemDato label="Montura">
                                <span className="font-medium">{item.nameSnapshot}</span>
                              </ItemDato>
                              <ItemDato label="Micas">{LENS_LABEL[item.lensOption]}</ItemDato>
                              <ItemDato label="Importe">
                                {formatPrice(item.priceCents * item.quantity)}
                              </ItemDato>
                              {item.lensOption !== "FRAME_ONLY" &&
                                (item.rxData ? (
                                  <ItemDato label="Fórmula">
                                    <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
                                      {rxLine(item.rxData as RxData)}
                                    </span>
                                    <CopyRxButton rxText={rxLine(item.rxData as RxData)} />
                                  </ItemDato>
                                ) : (
                                  order.status !== "CANCELLED" &&
                                  order.status !== "REFUNDED" && (
                                    <ItemDato label="Fórmula">
                                      <span className="rounded border border-warning-border bg-warning-bg px-2 py-0.5 text-xs font-medium text-warning-fg">
                                        ⚠ pendiente — contactar al cliente
                                      </span>
                                    </ItemDato>
                                  )
                                ))}
                            </li>
                          ))}
                        </ul>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
