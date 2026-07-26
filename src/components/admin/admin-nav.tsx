"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV = [
  { href: "/admin", label: "Inicio" },
  { href: "/admin/products", label: "Productos" },
  { href: "/admin/orders", label: "Pedidos" },
] as const

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Admin" className="flex gap-1 text-sm">
      {NAV.map((item) => {
        const active =
          item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "rounded-md bg-secondary px-3 py-1.5 font-medium text-secondary-foreground"
                : "rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
            }
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
