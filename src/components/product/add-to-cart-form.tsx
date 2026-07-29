"use client"

import { useRef, useState } from "react"
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

/** Transportador TABO en miniatura: semicírculo 0–180° con el meridiano del eje. */
function AxisMeridian({ deg, faded }: { deg: number; faded?: boolean }) {
  const rad = (deg * Math.PI) / 180
  const x = 20 + 16 * Math.cos(rad)
  const y = 20 - 16 * Math.sin(rad)
  return (
    <svg
      viewBox="0 0 40 24"
      className={`h-6 w-10 shrink-0 ${faded ? "opacity-40" : ""}`}
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

const clampAxis = (deg: number) => Math.min(180, Math.max(1, Math.round(deg)))

/** Diálogo con transportador grande: arrastra la aguja, toca el arco o usa flechas. */
function AxisPickerDialog({
  initial,
  eyeLabel,
  onApply,
  onClose,
}: {
  initial: number
  eyeLabel: string
  onApply: (deg: number) => void
  onClose: () => void
}) {
  const tr = useTranslations("Rx")
  const [deg, setDeg] = useState(initial)
  const svgRef = useRef<SVGSVGElement>(null)

  const CX = 130
  const CY = 126
  const R = 108

  function degFromPointer(e: React.PointerEvent) {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    // coords del viewBox (el svg escala responsivo)
    const x = ((e.clientX - rect.left) / rect.width) * 260
    const y = ((e.clientY - rect.top) / rect.height) * 140
    let angle = (Math.atan2(CY - y, x - CX) * 180) / Math.PI
    if (angle < 0) angle = angle < -90 ? 180 : 1
    setDeg(clampAxis(angle))
  }

  const rad = (deg * Math.PI) / 180
  const nx = CX + R * Math.cos(rad)
  const ny = CY - R * Math.sin(rad)

  const ticks = []
  for (let t = 0; t <= 180; t += 10) {
    const tr2 = (t * Math.PI) / 180
    const isMajor = t % 30 === 0
    const r1 = R
    const r2 = R - (isMajor ? 12 : 6)
    ticks.push(
      <line
        key={t}
        x1={CX + r1 * Math.cos(tr2)}
        y1={CY - r1 * Math.sin(tr2)}
        x2={CX + r2 * Math.cos(tr2)}
        y2={CY - r2 * Math.sin(tr2)}
        stroke={isMajor ? "var(--mira-muted)" : "var(--line)"}
        strokeWidth={isMajor ? 1.5 : 1}
      />,
    )
    if (isMajor) {
      ticks.push(
        <text
          key={`l${t}`}
          x={CX + (R - 24) * Math.cos(tr2)}
          y={CY - (R - 24) * Math.sin(tr2) + 3}
          textAnchor="middle"
          fontSize="10"
          fill="var(--mira-muted)"
        >
          {t}
        </text>,
      )
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={tr("axisPickerTitle", { eye: eyeLabel })}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose()
        if (e.key === "ArrowRight" || e.key === "ArrowUp") setDeg((d) => clampAxis(d + 1))
        if (e.key === "ArrowLeft" || e.key === "ArrowDown") setDeg((d) => clampAxis(d - 1))
      }}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-paper p-5 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-xl font-medium">
          {tr("axisPickerTitle", { eye: eyeLabel })}
        </h2>
        <p className="mt-1 text-xs text-muted-ink">{tr("axisPickerHint")}</p>

        <svg
          ref={svgRef}
          viewBox="0 0 260 140"
          className="mt-4 w-full cursor-crosshair touch-none select-none"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            degFromPointer(e)
          }}
          onPointerMove={(e) => {
            if (e.buttons > 0) degFromPointer(e)
          }}
        >
          <path
            d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
            fill="none"
            stroke="var(--line)"
            strokeWidth="2"
          />
          <line
            x1={CX - R}
            y1={CY}
            x2={CX + R}
            y2={CY}
            stroke="var(--line)"
            strokeWidth="1.5"
          />
          {ticks}
          <line
            x1={CX}
            y1={CY}
            x2={nx.toFixed(1)}
            y2={ny.toFixed(1)}
            stroke="var(--mira-accent)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle
            cx={nx.toFixed(1)}
            cy={ny.toFixed(1)}
            r="9"
            fill="var(--mira-accent)"
            stroke="var(--paper)"
            strokeWidth="2.5"
          />
          <text
            x={CX}
            y={CY - 34}
            textAnchor="middle"
            fontSize="30"
            fontWeight="600"
            fill="var(--ink)"
          >
            {deg}°
          </text>
        </svg>

        <div className="mt-3 flex items-center justify-center gap-2">
          {[-5, -1, +1, +5].map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => setDeg((d) => clampAxis(d + step))}
              className="min-w-11 rounded-full border border-line px-2 py-1.5 text-sm tabular-nums hover:border-accent"
            >
              {step > 0 ? `+${step}` : step}
            </button>
          ))}
          <label className="ml-2 flex items-center gap-1.5 text-xs text-muted-ink">
            {tr("axisPickerManual")}
            <select
              value={deg}
              onChange={(e) => setDeg(clampAxis(Number(e.target.value)))}
              className="rounded-lg border border-line bg-transparent px-2 py-1.5 text-sm text-ink"
            >
              {Array.from({ length: 180 }, (_, i) => i + 1).map((v) => (
                <option key={v} value={v}>
                  {v}°
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-line px-4 py-2.5 text-sm font-medium hover:border-accent"
          >
            {tr("axisPickerCancel")}
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(deg)
              onClose()
            }}
            className="flex-1 rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-accent-ink hover:opacity-90"
          >
            {tr("axisPickerApply", { deg })}
          </button>
        </div>
      </div>
    </div>
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
  const [axisPicker, setAxisPicker] = useState<(typeof EYES)[number] | null>(null)
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
              <div className="grid grid-cols-[auto_1fr_1fr_1.2fr_1fr] items-center gap-2 text-sm">
                <span />
                <span className="text-xs text-muted-ink">{tr("sph")}</span>
                <span className="text-xs text-muted-ink">{tr("cyl")}</span>
                <span className="text-xs text-muted-ink">{tr("axis")}</span>
                <span className="text-xs text-muted-ink">{tr("add")}</span>
                {EYES.map((eye) => (
                  <div key={eye} className="contents">
                    <span className="text-xs font-medium">{tr(eye)}</span>
                    {RX_FIELDS.map((field) =>
                      field === "axis" ? (
                        <button
                          key={field}
                          type="button"
                          disabled={!rxForm[eye].cyl}
                          onClick={() => setAxisPicker(eye)}
                          aria-label={tr("axisPickerOpen", { eye: tr(eye) })}
                          aria-invalid={invalidPaths.includes(`${eye}.axis`)}
                          title={
                            rxForm[eye].cyl ? tr("axisPickerOpenHint") : tr("axisNeedsCyl")
                          }
                          className={`flex items-center justify-between gap-1 ${inputClass(`${eye}.axis`)} disabled:cursor-not-allowed disabled:opacity-40`}
                        >
                          <span className="tabular-nums">
                            {rxForm[eye].axis ? `${rxForm[eye].axis}°` : tr("axisChoose")}
                          </span>
                          <AxisMeridian
                            deg={Number(rxForm[eye].axis) || 90}
                            faded={!rxForm[eye].axis}
                          />
                        </button>
                      ) : (
                        <select
                          key={field}
                          value={rxForm[eye][field]}
                          onChange={(e) => setRxField(eye, field, e.target.value)}
                          aria-label={`${tr(eye)} ${tr(field)}`}
                          aria-invalid={invalidPaths.includes(`${eye}.${field}`)}
                          className={inputClass(`${eye}.${field}`)}
                        >
                          <option value="">
                            {field === "cyl" ? tr("noCyl") : tr("none")}
                          </option>
                          {RX_OPTIONS[field].map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      ),
                    )}
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
              {(!rxForm.od.cyl || !rxForm.os.cyl) && (
                <p className="rounded-lg bg-accent/8 px-3 py-2 text-xs leading-relaxed text-muted-ink">
                  💡 {tr("cylSuggestion")}
                </p>
              )}
              {invalidPaths.length > 0 && (
                <p role="alert" className="text-sm text-danger">
                  {tr("error")}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {axisPicker && (
        <AxisPickerDialog
          initial={Number(rxForm[axisPicker].axis) || 90}
          eyeLabel={tr(axisPicker)}
          onApply={(deg) => setRxField(axisPicker, "axis", String(deg))}
          onClose={() => setAxisPicker(null)}
        />
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
