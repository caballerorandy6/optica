import Link from "next/link"

import { AdminNav } from "@/components/admin/admin-nav"
import { Button } from "@/components/ui/button"
import { logoutAdmin } from "@/lib/admin-auth"

export default function AdminPanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-baseline gap-2">
              <span className="font-display text-xl font-semibold tracking-tight">
                MIRA<span className="text-amber">.</span>
              </span>
              <span className="text-sm text-muted-foreground">Admin</span>
            </Link>
            <AdminNav />
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Ver tienda ↗
            </Link>
            <form action={logoutAdmin}>
              <Button type="submit" size="sm" variant="secondary">
                Salir
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </>
  )
}
