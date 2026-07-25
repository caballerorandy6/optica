import { z } from "zod"

/** Un ojo de la fórmula: esfera, cilindro, eje. */
const eyeSchema = z.object({
  sph: z.coerce.number().min(-20).max(20).multipleOf(0.25),
  cyl: z.coerce.number().min(-6).max(6).multipleOf(0.25).optional().or(z.literal("")),
  axis: z.coerce.number().int().min(0).max(180).optional().or(z.literal("")),
})

/**
 * Receta simplificada (wizard del paquete): OD/OI + distancia pupilar.
 * Progresivos, prismas e índices especiales quedan fuera (fase 2).
 */
export const rxSchema = z.object({
  od: eyeSchema,
  os: eyeSchema,
  pd: z.coerce.number().min(40).max(80),
})

export type RxData = z.infer<typeof rxSchema>
