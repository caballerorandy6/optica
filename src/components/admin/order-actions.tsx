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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cancelAndRefund, markDelivered, shipOrder, undoOrderStep } from "@/lib/admin-actions"
import { formatPrice } from "@/lib/format"
import { CARRIERS, type CarrierId } from "@/lib/shipping"

export function ShipOrderDialog({ id, orderLabel }: { id: string; orderLabel: string }) {
  const [open, setOpen] = useState(false)
  const [carrier, setCarrier] = useState<CarrierId>("USPS")
  const [tracking, setTracking] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submit() {
    setError(null)
    startTransition(async () => {
      const result = await shipOrder({ id, carrier, trackingNumber: tracking })
      if (result.ok) {
        setOpen(false)
        setTracking("")
      } else {
        setError(result.error ?? "Error")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Marcar enviado…</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Enviar pedido {orderLabel}</DialogTitle>
          <DialogDescription>
            Elige la paquetería y pega el número de guía. El cliente podrá rastrearlo en la
            página de seguimiento.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`carrier-${id}`}>Paquetería</Label>
            <Select value={carrier} onValueChange={(v) => setCarrier(v as CarrierId)}>
              <SelectTrigger id={`carrier-${id}`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CARRIERS).map(([key, c]) => (
                  <SelectItem key={key} value={key}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {carrier !== "LOCAL" && (
            <div className="space-y-2">
              <Label htmlFor={`tracking-${id}`}>Número de guía</Label>
              <Input
                id={`tracking-${id}`}
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                placeholder="9400 1000 0000 ..."
              />
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={pending} className="w-full">
            {pending ? "Guardando…" : "Confirmar envío"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function DeliverButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={pending}
      onClick={() => startTransition(async () => void (await markDelivered(id)))}
    >
      ✓ Entregado
    </Button>
  )
}

export function UndoButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <Button
      size="xs"
      variant="ghost"
      disabled={pending}
      onClick={() => startTransition(async () => void (await undoOrderStep(id)))}
    >
      Deshacer
    </Button>
  )
}

export function RefundDialog({
  id,
  orderLabel,
  totalCents,
}: {
  id: string
  orderLabel: string
  totalCents: number
}) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submit() {
    setError(null)
    startTransition(async () => {
      const result = await cancelAndRefund(id)
      if (result.ok) setOpen(false)
      else setError(result.error ?? "Error")
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="xs" variant="destructive">
          Cancelar…
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cancelar y reembolsar {orderLabel}</DialogTitle>
          <DialogDescription>
            Se devolverán <strong>{formatPrice(totalCents)}</strong> a la tarjeta del cliente
            vía Stripe y el stock volverá al inventario. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Volver
          </Button>
          <Button variant="destructive" onClick={submit} disabled={pending}>
            {pending ? "Reembolsando…" : "Sí, reembolsar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function CopyRxButton({ rxText }: { rxText: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      variant="ghost"
      size="xs"
      onClick={async () => {
        await navigator.clipboard.writeText(rxText)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
    >
      {copied ? "Copiada ✓" : "Copiar"}
    </Button>
  )
}
