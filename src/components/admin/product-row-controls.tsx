"use client"

import { useState, useTransition } from "react"

import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { updateProduct } from "@/lib/admin-actions"

type Props = {
  id: string
  name: string
  priceCents: number
  published: boolean
  featured: boolean
}

export function ProductRowControls({ id, name, priceCents, published, featured }: Props) {
  const [price, setPrice] = useState((priceCents / 100).toFixed(2))
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function save(data: { published?: boolean; featured?: boolean; priceCents?: number }) {
    setError(null)
    startTransition(async () => {
      const result = await updateProduct({ id, ...data })
      if (!result.ok) setError(result.error ?? "Error")
    })
  }

  function savePrice() {
    const value = Math.round(Number(price.replace(",", ".")) * 100)
    if (Number.isNaN(value) || value < 0) {
      setPrice((priceCents / 100).toFixed(2))
      return
    }
    if (value !== priceCents) save({ priceCents: value })
  }

  return (
    <div className="flex items-center gap-5">
      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground">$</span>
        <Input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onBlur={savePrice}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          inputMode="decimal"
          aria-label={`Precio de ${name}`}
          className="h-8 w-24 text-right"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Switch
          checked={published}
          disabled={pending}
          onCheckedChange={(v) => save({ published: v })}
          aria-label={`Publicar ${name}`}
        />
        <span className="hidden text-muted-foreground lg:inline">Publicada</span>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Switch
          checked={featured}
          disabled={pending}
          onCheckedChange={(v) => save({ featured: v })}
          aria-label={`Destacar ${name}`}
        />
        <span className="hidden text-muted-foreground lg:inline">Destacada</span>
      </label>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  )
}
