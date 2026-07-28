"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"

/* Librerías Jeeliz FaceFilter (Apache 2.0) self-hosteadas en /public/vto — scripts
   clásicos con globals; se cargan solo cuando el usuario abre el try-on. */
declare global {
  interface Window {
    THREE: any // eslint-disable-line @typescript-eslint/no-explicit-any
    JEELIZFACEFILTER: any // eslint-disable-line @typescript-eslint/no-explicit-any
    JeelizThreeHelper: any // eslint-disable-line @typescript-eslint/no-explicit-any
    JeelizResizer: any // eslint-disable-line @typescript-eslint/no-explicit-any
    JeelizThreeGlassesCreator: any // eslint-disable-line @typescript-eslint/no-explicit-any
  }
}

const SCRIPTS = [
  "/vto/three.min.js",
  "/vto/jeelizFaceFilter.js",
  "/vto/JeelizThreeHelper.js",
  "/vto/JeelizResizer.js",
  "/vto/JeelizThreeGlassesCreator.js",
]

/* Caché por promesa EN WINDOW: sobrevive al hot-reload de Next en dev (que
   re-evalúa este módulo) y a montajes dobles de StrictMode. Nunca se inyecta
   dos veces la misma etiqueta <script>. */
function scriptCache(): Map<string, Promise<void>> {
  const w = window as unknown as { __miraVto?: Map<string, Promise<void>> }
  if (!w.__miraVto) w.__miraVto = new Map()
  return w.__miraVto
}

function loadScript(src: string): Promise<void> {
  const cache = scriptCache()
  let promise = cache.get(src)
  if (!promise) {
    promise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`)
      if (existing) return resolve() // ya inyectado por una evaluación anterior
      const s = document.createElement("script")
      s.src = src
      s.onload = () => resolve()
      s.onerror = () => {
        cache.delete(src) // permitir reintento si falló la red
        s.remove()
        reject(new Error(`No se pudo cargar ${src}`))
      }
      document.head.appendChild(s)
    })
    cache.set(src, promise)
  }
  return promise
}

const CANVAS_ID = "mira-vto-canvas"

type Status = "loading" | "running" | "error"

/**
 * Escala relativa de la montura según sus medidas reales (mica-puente-varilla).
 * Ancho frontal ≈ 2×mica + puente; 122 mm es la referencia del modelo 3D.
 */
const REFERENCE_WIDTH_MM = 122
function sizeScaleFactor(size: string | null | undefined): number {
  if (!size) return 1
  const nums = size.match(/\d+/g)
  if (!nums || nums.length < 2) return 1
  const widthMm = Number(nums[0]) * 2 + Number(nums[1])
  if (widthMm < 80 || widthMm > 170) return 1
  return Math.min(1.15, Math.max(0.75, widthMm / REFERENCE_WIDTH_MM))
}

export function TryOnButton({ colorHex, size }: { colorHex: string; size?: string | null }) {
  const t = useTranslations("TryOn")
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex items-center gap-2 rounded-full border border-accent px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent hover:text-accent-ink"
      >
        <span aria-hidden="true">👓</span> {t("button")}
      </button>
      {open && (
        <TryOnModal colorHex={colorHex} size={size ?? null} onClose={() => setOpen(false)} />
      )}
    </>
  )
}

function TryOnModal({
  colorHex,
  size,
  onClose,
}: {
  colorHex: string
  size: string | null
  onClose: () => void
}) {
  const t = useTranslations("TryOn")
  const [status, setStatus] = useState<Status>("loading")
  const [applyRealSize, setApplyRealSize] = useState(true)
  const glassesRef = useRef<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any
  const cameraRef = useRef<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any

  const realFactor = sizeScaleFactor(size)

  // escala en vivo: talla real de la montura vs talla estándar
  useEffect(() => {
    if (status !== "running" || !glassesRef.current) return
    glassesRef.current.scale.setScalar(0.006 * (applyRealSize ? realFactor : 1))
  }, [status, applyRealSize, realFactor])

  // teñir el armazón con el color de la variante (los meshes cargan async)
  useEffect(() => {
    if (status !== "running") return
    const hex = /^#[0-9a-f]{6}$/i.test(colorHex) ? colorHex : "#232326"
    const interval = setInterval(() => {
      const glasses = glassesRef.current
      if (!glasses) return
      let tinted = false
      glasses.traverse((node: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (node.isMesh && node.material?.uniforms?.diffuse) {
          node.material.uniforms.diffuse.value.set(hex)
          tinted = true
        } else if (node.isMesh && node.material?.color && !node.material.uniforms) {
          // micas: neutras y sutiles, no el azul del demo
          node.material.color.set("#8a9aa5")
          node.material.opacity = 0.35
        }
      })
      if (tinted) clearInterval(interval)
    }, 250)
    return () => clearInterval(interval)
  }, [status, colorHex])

  useEffect(() => {
    let cancelled = false

    async function start() {
      try {
        for (const src of SCRIPTS) await loadScript(src)
        if (cancelled) return

        window.JeelizResizer.size_canvas({
          canvasId: CANVAS_ID,
          callback: (isError: boolean) => {
            if (cancelled) return
            if (isError) return setStatus("error")

            window.JEELIZFACEFILTER.init({
              canvasId: CANVAS_ID,
              NNCPath: "/vto/",
              followZRot: true,
              maxFacesDetected: 1,
              callbackReady: (errCode: string, spec: unknown) => {
                if (cancelled) return
                if (errCode) {
                  console.error("VTO error:", errCode)
                  return setStatus("error")
                }
                const three = window.THREE
                const stuffs = window.JeelizThreeHelper.init(spec, () => {})
                stuffs.renderer.toneMapping = three.ACESFilmicToneMapping
                stuffs.renderer.outputEncoding = three.sRGBEncoding

                const r = window.JeelizThreeGlassesCreator({
                  envMapURL: "/vto/envMap.jpg",
                  frameMeshURL: "/vto/models3D/glassesFramesBranchesBent.json",
                  lensesMeshURL: "/vto/models3D/glassesLenses.json",
                  occluderURL: "/vto/models3D/face.json",
                })
                const dy = 0.07
                r.occluder.rotation.set(0.3, 0, 0)
                r.occluder.position.set(0, 0.03 + dy, -0.04)
                r.occluder.scale.multiplyScalar(0.0084)
                stuffs.faceObject.add(r.occluder)
                r.glasses.position.set(0, dy, 0.4)
                r.glasses.scale.multiplyScalar(0.006)
                stuffs.faceObject.add(r.glasses)
                glassesRef.current = r.glasses

                cameraRef.current = window.JeelizThreeHelper.create_camera()
                setStatus("running")
              },
              callbackTrack: (detectState: unknown) => {
                if (cameraRef.current) {
                  window.JeelizThreeHelper.render(detectState, cameraRef.current)
                }
              },
            })
          },
        })
      } catch (err) {
        console.error(err)
        if (!cancelled) setStatus("error")
      }
    }

    start()
    return () => {
      cancelled = true
      glassesRef.current = null
      cameraRef.current = null
      try {
        window.JEELIZFACEFILTER?.destroy()
      } catch {
        // el motor puede no haber llegado a inicializarse
      }
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("title")}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-paper p-4 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-medium">{t("title")}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="rounded-full border border-line px-3 py-1 text-sm hover:border-accent"
          >
            ✕
          </button>
        </div>

        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black">
          <canvas id={CANVAS_ID} className="h-full w-full" width={600} height={600} />
          {status === "loading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-sm text-white">
              <span className="size-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              {t("loading")}
            </div>
          )}
          {status === "error" && (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white">
              {t("error")}
            </div>
          )}
        </div>

        {size && realFactor !== 1 && status === "running" && (
          <label className="mt-3 flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={applyRealSize}
              onChange={(e) => setApplyRealSize(e.target.checked)}
              className="accent-(--accent)"
            />
            {t("sizeToggle", { size: size.replace(/\s/g, "") })}
          </label>
        )}
        {size && realFactor !== 1 && status === "running" && (
          <p className="mt-1 text-xs text-muted-ink">{t("sizeToggleHint")}</p>
        )}
        <p className="mt-2 text-xs text-muted-ink">{t("disclaimer")}</p>
      </div>
    </div>
  )
}
