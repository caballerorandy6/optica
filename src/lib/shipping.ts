/** Paqueterías soportadas y sus URLs públicas de rastreo. */
export const CARRIERS = {
  USPS: {
    label: "USPS",
    trackingUrl: (n: string) =>
      `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(n)}`,
  },
  UPS: {
    label: "UPS",
    trackingUrl: (n: string) =>
      `https://www.ups.com/track?tracknum=${encodeURIComponent(n)}`,
  },
  FEDEX: {
    label: "FedEx",
    trackingUrl: (n: string) =>
      `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(n)}`,
  },
  LOCAL: {
    label: "Entrega local (Houston)",
    trackingUrl: null,
  },
} as const

export type CarrierId = keyof typeof CARRIERS

export function isCarrier(value: string): value is CarrierId {
  return value in CARRIERS
}

export function trackingUrl(carrier: string | null, trackingNumber: string | null) {
  if (!carrier || !trackingNumber || !isCarrier(carrier)) return null
  return CARRIERS[carrier].trackingUrl?.(trackingNumber) ?? null
}

/** Número de pedido visible: arranca en #1001 (solo presentación). */
export function formatOrderNumber(number: number): string {
  return `#${1000 + number}`
}
