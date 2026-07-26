import { z } from "zod"

/** "" o ausente → undefined; cualquier otra cosa se valida como número. */
const optionalMeasure = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : v), schema.optional())

/** Un ojo de la fórmula: esfera, cilindro, eje. */
const eyeSchema = z
  .object({
    sph: z.coerce.number().min(-20).max(20).multipleOf(0.25),
    cyl: optionalMeasure(z.coerce.number().min(-6).max(6).multipleOf(0.25)),
    axis: optionalMeasure(z.coerce.number().int().min(1).max(180)),
  })
  .superRefine((eye, ctx) => {
    // CYL y eje van en pareja: un cilindro sin orientación no se puede fabricar
    const hasCyl = eye.cyl !== undefined && eye.cyl !== 0
    const hasAxis = eye.axis !== undefined
    if (hasCyl && !hasAxis) {
      ctx.addIssue({ code: "custom", path: ["axis"], message: "Eje requerido con CYL" })
    }
    if (hasAxis && !hasCyl) {
      ctx.addIssue({ code: "custom", path: ["cyl"], message: "CYL requerido con eje" })
    }
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
