"use client"

import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"

import { Link, usePathname } from "@/i18n/navigation"

type NavKey = "frames" | "bestsellers" | "about"

export function NavLinks() {
  const t = useTranslations("Header")
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const active: NavKey | null = pathname.startsWith("/frames")
    ? searchParams.get("featured") === "1"
      ? "bestsellers"
      : "frames"
    : pathname.startsWith("/about")
      ? "about"
      : null

  const items: { key: NavKey; href: string }[] = [
    { key: "frames", href: "/frames" },
    { key: "bestsellers", href: "/frames?featured=1" },
    { key: "about", href: "/about" },
  ]

  return (
    <>
      {items.map((item) => {
        const isActive = active === item.key
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "font-medium text-ink underline decoration-amber decoration-2 underline-offset-8"
                : "text-muted-ink transition-colors hover:text-ink"
            }
          >
            {t(item.key)}
          </Link>
        )
      })}
    </>
  )
}
