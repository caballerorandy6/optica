import Link from "next/link"
import { Prisma } from "@prisma/client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatPrice } from "@/lib/format"
import { prisma } from "@/lib/prisma"

export default async function AdminHomePage() {
  const SOLD = ["PAID", "SHIPPED", "FULFILLED"] as const
  const [published, total, toShip, revenue, pendingRx] = await Promise.all([
    prisma.product.count({ where: { published: true } }),
    prisma.product.count(),
    prisma.order.count({ where: { status: "PAID" } }),
    prisma.order.aggregate({
      where: { status: { in: [...SOLD] } },
      _sum: { totalCents: true },
    }),
    prisma.orderItem.count({
      where: {
        order: { status: { in: [...SOLD] } },
        lensOption: { not: "FRAME_ONLY" },
        rxData: { equals: Prisma.DbNull },
      },
    }),
  ])

  const stats = [
    { label: "Monturas publicadas", value: `${published} / ${total}`, href: "/admin/products" },
    {
      label: "Por enviar",
      value: String(toShip),
      href: "/admin/orders",
      warning: toShip > 0,
    },
    {
      label: "Ventas totales",
      value: formatPrice(revenue._sum.totalCents ?? 0),
      href: "/admin/orders",
    },
    {
      label: "Fórmulas por recibir",
      value: String(pendingRx),
      href: "/admin/orders",
      warning: pendingRx > 0,
    },
  ]

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Resumen</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card
              className={`h-full transition-shadow hover:shadow-md ${
                s.warning ? "border-warning-border bg-warning-bg" : ""
              }`}
            >
              <CardHeader className="pb-2">
                <CardTitle
                  className={`text-sm font-medium ${
                    s.warning ? "text-warning-fg" : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  className={`text-3xl font-semibold ${s.warning ? "text-warning-fg" : ""}`}
                >
                  {s.value}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
