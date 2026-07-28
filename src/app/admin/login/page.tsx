import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { loginAdmin } from "@/lib/admin-auth"

type SearchParams = Promise<{ error?: string }>

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { error } = await searchParams
  const demoPassword =
    process.env.DEMO_MODE === "1" ? process.env.ADMIN_PASSWORD : null

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="font-display text-3xl font-semibold tracking-tight">
            MIRA<span className="text-amber">.</span>{" "}
            <span className="text-xl font-normal text-muted-foreground">Admin</span>
          </CardTitle>
          <CardDescription>
            Panel de administración de la tienda. Acceso solo para el personal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={loginAdmin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoFocus
                autoComplete="current-password"
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                Contraseña incorrecta. Intenta de nuevo.
              </p>
            )}
            <Button type="submit" className="w-full">
              Entrar
            </Button>
          </form>
          {demoPassword && (
            <div className="mt-4 rounded-md border border-dashed bg-muted/50 p-3 text-sm">
              <p className="font-medium">🔑 Proyecto demo — acceso de prueba</p>
              <p className="mt-1 text-muted-foreground">
                Contraseña: <code className="font-mono font-semibold">{demoPassword}</code>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      <Link
        href="/"
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Volver a la tienda
      </Link>
    </main>
  )
}
