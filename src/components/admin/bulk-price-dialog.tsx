"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { bulkSetPrice } from "@/lib/admin-actions"
import type { ProductsFilter } from "@/lib/admin-products-filter"

export function BulkPriceDialog({
  filter,
  total,
  filterLabel,
}: {
  filter: ProductsFilter
  total: number
  filterLabel: string
}) {
  const [open, setOpen] = useState(false)
  const [price, setPrice] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<number | null>(null)
  const [pending, startTransition] = useTransition()

  function submit() {
    setError(null)
    const cents = Math.round(Number(price.replace(",", ".")) * 100)
    if (Number.isNaN(cents) || cents < 100) {
      setError("Ingresa un precio válido (mínimo $1.00)")
      return
    }
    startTransition(async () => {
      const result = await bulkSetPrice({ ...filter, priceCents: cents })
      if (result.ok) {
        setDone(result.count ?? 0)
      } else {
        setError(result.error ?? "Error")
      }
    })
  }

  function reset(openState: boolean) {
    setOpen(openState)
    if (!openState) {
      setPrice("")
      setError(null)
      setDone(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={total === 0}>
          Precio en bloque…
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Precio en bloque</DialogTitle>
          <DialogDescription>
            Aplicará el mismo precio a las <strong>{total}</strong>{" "}
            {total === 1 ? "montura" : "monturas"} del filtro actual ({filterLabel}). Después
            puedes afinar cualquiera individualmente.
          </DialogDescription>
        </DialogHeader>
        {done === null ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="bulk-price">Precio (USD)</Label>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">$</span>
                <Input
                  id="bulk-price"
                  inputMode="decimal"
                  placeholder="99.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  autoFocus
                />
              </div>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => reset(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button onClick={submit} disabled={pending}>
                {pending ? "Aplicando…" : `Aplicar a ${total}`}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <p className="text-sm">
              ✓ Precio aplicado a <strong>{done}</strong>{" "}
              {done === 1 ? "montura" : "monturas"}.
            </p>
            <DialogFooter>
              <Button onClick={() => reset(false)}>Listo</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
