/**
 * Identidad del sitio. Marca placeholder heredada de la demo de diseño;
 * cuando el cliente confirme nombre/datos reales, se cambia solo aquí.
 */
export const SITE = {
  name: "MIRA",
  fullName: "MIRA Eyewear",
  tagline: "Mira. It means look.",
  city: "Houston, TX",
  instagram: "@mira.eyewear",
  phone: "(713) 555-0100",
  email: "hola@miraeyewear.com",
} as const

export const FREE_SHIPPING_THRESHOLD_CENTS = 5000

/**
 * Opciones de micas del wizard simplificado (acordado en el paquete).
 * Precios de PRUEBA — el cliente definirá los reales.
 * Las keys coinciden con el enum LensOption de Prisma.
 */
export const LENS_OPTIONS = [
  { id: "FRAME_ONLY", priceCents: 0 },
  { id: "BASIC", priceCents: 3000 },
  { id: "ANTI_REFLECTIVE", priceCents: 6000 },
  { id: "BLUE_LIGHT", priceCents: 5000 },
] as const

export type LensOptionId = (typeof LENS_OPTIONS)[number]["id"]
