"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"

import { useCart } from "@/components/cart/cart-context"
import { LENS_OPTIONS, type LensOptionId } from "@/lib/constants"
import { formatPrice } from "@/lib/format"
import { rxSchema, type RxData } from "@/lib/validations"

type ProductInfo = { id: string; slug: string; name: string; priceCents: number }
type VariantInfo = {
  id: string
  color: string
  colorSlug: string
  stock: number
  imageUrl: string | null
}

const RX_FIELDS = ["sph", "cyl", "axis", "add"] as const
const EYES = ["od", "os"] as const

/** Rangos estilo Zeelool: dropdowns con solo valores válidos. */
function quarterSteps(min: number, max: number): string[] {
  const out: string[] = []
  for (let v = min; v <= max + 1e-9; v += 0.25) {
    out.push(v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2))
  }
  return out
}
const SPH_VALUES = quarterSteps(-20, 12)
const CYL_VALUES = quarterSteps(-6, 6)
const AXIS_VALUES = Array.from({ length: 180 }, (_, i) => String(i + 1))
const ADD_VALUES = quarterSteps(0.75, 4)
const PD_VALUES = Array.from({ length: 41 }, (_, i) => String(40 + i))

const RX_OPTIONS: Record<(typeof RX_FIELDS)[number], string[]> = {
  sph: SPH_VALUES,
  cyl: CYL_VALUES,
  axis: AXIS_VALUES,
  add: ADD_VALUES,
}

const emptyRxForm = {
  od: { sph: "0.00", cyl: "", axis: "", add: "" },
  os: { sph: "0.00", cyl: "", axis: "", add: "" },
  pd: "63",
}

/** Transportador TABO: semicírculo 0–180° con el meridiano del eje elegido. */
function AxisMeridian({ deg }: { deg: number | null }) {
  if (!deg) return <span aria-hidden="true" />
  const rad = (deg * Math.PI) / 180
  const x = 20 + 16 * Math.cos(rad)
  const y = 20 - 16 * Math.sin(rad)
  return (
    <svg
      viewBox="0 0 40 24"
      className="h-6 w-10 shrink-0"
      role="img"
      aria-label={`${deg}°`}
    >
      <path
        d="M 4 20 A 16 16 0 0 1 36 20"
        fill="none"
        stroke="var(--line)"
        strokeWidth="1.5"
      />
      <line x1="4" y1="20" x2="36" y2="20" stroke="var(--line)" strokeWidth="1" />
      <line
        x1="20"
        y1="20"
        x2={x.toFixed(1)}
        y2={y.toFixed(1)}
        stroke="var(--mira-accent)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx={x.toFixed(1)} cy={y.toFixed(1)} r="2" fill="var(--mira-accent)" />
    </svg>
  )
}

export function AddToCartForm({
  product,
  variant,
}: {
  product: ProductInfo
  variant: VariantInfo | null
}) {
  const t = useTranslations("Cart")
  const tl = useTranslations("Lens")
  const tr = useTranslations("Rx")
  const { addItem } = useCart()

  const [lensOption, setLensOption] = useState<LensOptionId>("FRAME_ONLY")
  const [rxLater, setRxLater] = useState(false)
  const [rxForm, setRxForm] = useState(emptyRxForm)
  const [invalidPaths, setInvalidPaths] = useState<string[]>([])
  const [added, setAdded] = useState(false)

  const needsRx = lensOption !== "FRAME_ONLY"
  const lensPrice = LENS_OPTIONS.find((o) => o.id === lensOption)?.priceCents ?? 0
  const totalCents = product.priceCents + lensPrice
  const outOfStock = !variant || variant.stock === 0

  function setRxField(eye: (typeof EYES)[number], field: string, value: string) {
    setRxForm((prev) => {
      const next = { ...prev[eye], [field]: value }
      // lente esférico (sin cilindro) no tiene eje: al quitar CYL se limpia el eje
      if (field === "cyl" && value === "") next.axis = ""
      return { ...prev, [eye]: next }
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!variant) return

    let rx: RxData | null = null
    if (needsRx && !rxLater) {
      const result = rxSchema.safeParse(rxForm)
      if (!result.success) {
        setInvalidPaths(result.error.issues.map((i) => i.path.join(".")))
        return
      }
      rx = result.data
    }
    setInvalidPaths([])

    addItem({
      productId: product.id,
      variantId: variant.id,
      slug: product.slug,
      name: product.name,
      color: variant.color,
      colorSlug: variant.colorSlug,
      imageUrl: variant.imageUrl,
      framePriceCents: product.priceCents,
      lensOption,
      rx,
    })

    // dejar el formulario listo para un pedido nuevo
    setLensOption("FRAME_ONLY")
    setRxLater(false)
    setRxForm(emptyRxForm)
    setAdded(true)
    setTimeout(() => setAdded(false), 2500)
  }

  const inputClass = (path: string) =>
    `w-full rounded-lg border bg-transparent px-2 py-1.5 text-sm ${
      invalidPaths.includes(path) ? "border-red-500" : "border-line"
    }`

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      <fieldset>
        <legend className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-ink">
          {tl("title")}
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {LENS_OPTIONS.map((option) => (
            <label
              key={option.id}
              className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-sm transition-colors ${
                lensOption === option.id
                  ? "border-accent bg-accent/5"
                  : "border-line hover:border-accent/50"
              }`}
            >
              <input
                type="radio"
                name="lensOption"
                value={option.id}
                checked={lensOption === option.id}
                onChange={() => setLensOption(option.id)}
                className="mt-0.5 accent-(--accent)"
              />
              <span>
                <span className="block font-medium">
                  {tl(option.id)}{" "}
                  <span className="text-muted-ink">
                    {option.priceCents === 0
                      ? tl("free")
                      : `+${formatPrice(option.priceCents)}`}
                  </span>
                </span>
                <span className="block text-xs text-muted-ink">{tl(`${option.id}_desc`)}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {needsRx && (
        <div className="mt-4 rounded-xl border border-line p-4">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-ink">
            {tr("title")}
          </p>

          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={rxLater}
              onChange={(e) => setRxLater(e.target.checked)}
              className="accent-(--accent)"
            />
            {tr("later")}
          </label>
          {rxLater ? (
            <p className="mt-1 text-xs text-muted-ink">{tr("laterHint")}</p>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto_1fr] items-center gap-2 text-sm">
                <span />
                <span className="text-xs text-muted-ink">{tr("sph")}</span>
                <span className="text-xs text-muted-ink">{tr("cyl")}</span>
                <span className="text-xs text-muted-ink">{tr("axis")}</span>
                <span />
                <span className="text-xs text-muted-ink">{tr("add")}</span>
                {EYES.map((eye) => (
                  <div key={eye} className="contents">
                    <span className="text-xs font-medium">{tr(eye)}</span>
                    {RX_FIELDS.map((field) => (
                      <div key={field} className="contents">
                        <select
                          value={rxForm[eye][field]}
                          onChange={(e) => setRxField(eye, field, e.target.value)}
                          disabled={field === "axis" && !rxForm[eye].cyl}
                          title={
                            field === "axis" && !rxForm[eye].cyl
                              ? tr("axisNeedsCyl")
                              : undefined
                          }
                          aria-label={`${tr(eye)} ${tr(field)}`}
                          aria-invalid={invalidPaths.includes(`${eye}.${field}`)}
                          className={`${inputClass(`${eye}.${field}`)} disabled:cursor-not-allowed disabled:opacity-40`}
                        >
                          <option value="">{tr("none")}</option>
                          {RX_OPTIONS[field].map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                        {field === "axis" && (
                          <AxisMeridian deg={Number(rxForm[eye].axis) || null} />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="pd" className="text-xs font-medium">
                  {tr("pd")}
                </label>
                <select
                  id="pd"
                  value={rxForm.pd}
                  onChange={(e) => setRxForm((p) => ({ ...p, pd: e.target.value }))}
                  aria-invalid={invalidPaths.includes("pd")}
                  className={`${inputClass("pd")} max-w-24`}
                >
                  {PD_VALUES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-muted-ink">{tr("pdHint")}</span>
              </div>
              {invalidPaths.length > 0 && (
                <p role="alert" className="text-sm text-danger">
                  {tr("error")}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-6 space-y-2">
        <button
          type="submit"
          disabled={outOfStock || added}
          className="w-full rounded-full bg-accent px-6 py-3 font-medium text-accent-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {added
            ? t("added")
            : outOfStock
              ? t("outOfStock")
              : `${t("addToCart")} — ${formatPrice(totalCents)}`}
        </button>
      </div>
    </form>
  )
}
