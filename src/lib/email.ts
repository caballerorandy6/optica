import { Resend } from "resend"

import { SITE } from "@/lib/constants"
import { formatPrice } from "@/lib/format"
import { CARRIERS, formatOrderNumber, isCarrier, trackingUrl } from "@/lib/shipping"

type Locale = "es" | "en"

type EmailOrder = {
  number: number
  email: string
  name: string
  locale: string
  totalCents: number
  carrier?: string | null
  trackingNumber?: string | null
  items: { nameSnapshot: string; quantity: number; priceCents: number }[]
}

const COPY = {
  es: {
    confirmSubject: (n: string) => `Tu pedido ${n} está confirmado — ${SITE.fullName}`,
    confirmTitle: "¡Gracias por tu compra!",
    confirmIntro: (name: string, n: string) =>
      `Hola ${name || ""}: recibimos tu pago y tu pedido ${n} ya está en preparación.`,
    shippedSubject: (n: string) => `Tu pedido ${n} va en camino — ${SITE.fullName}`,
    shippedTitle: "¡Tu pedido va en camino!",
    shippedIntro: (name: string, n: string, carrier: string) =>
      `Hola ${name || ""}: tu pedido ${n} salió con ${carrier}.`,
    localDelivery: "Entrega local en Houston — te contactaremos para coordinar.",
    trackPackage: "Rastrear paquete",
    trackOrder: "Seguir mi pedido",
    total: "Total",
    rxNote: "Si elegiste enviar tu fórmula después, te contactaremos pronto.",
    help: `¿Dudas? Escríbenos a ${SITE.email}`,
  },
  en: {
    confirmSubject: (n: string) => `Your order ${n} is confirmed — ${SITE.fullName}`,
    confirmTitle: "Thank you for your purchase!",
    confirmIntro: (name: string, n: string) =>
      `Hi ${name || ""}: we received your payment and your order ${n} is being prepared.`,
    shippedSubject: (n: string) => `Your order ${n} is on its way — ${SITE.fullName}`,
    shippedTitle: "Your order is on its way!",
    shippedIntro: (name: string, n: string, carrier: string) =>
      `Hi ${name || ""}: your order ${n} shipped with ${carrier}.`,
    localDelivery: "Local delivery in Houston — we'll reach out to coordinate.",
    trackPackage: "Track package",
    trackOrder: "Track my order",
    total: "Total",
    rxNote: "If you chose to send your prescription later, we'll reach out soon.",
    help: `Questions? Write to us at ${SITE.email}`,
  },
} as const

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
}

function trackPageUrl(order: EmailOrder, locale: Locale): string {
  const prefix = locale === "es" ? "" : "/en"
  const params = `order=${1000 + order.number}&email=${encodeURIComponent(order.email)}`
  return `${siteUrl()}${prefix}/track?${params}`
}

function layout(title: string, body: string): string {
  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#faf9f6;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#26211b">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%">
        <tr><td style="padding-bottom:20px;font-size:26px;font-weight:700;letter-spacing:-0.5px">
          MIRA<span style="color:#b07a22">.</span>
        </td></tr>
        <tr><td style="background:#ffffff;border:1px solid #e3dfd6;border-radius:14px;padding:28px">
          <h1 style="margin:0 0 12px;font-size:22px">${title}</h1>
          ${body}
        </td></tr>
        <tr><td style="padding-top:16px;font-size:12px;color:#675f54;text-align:center">
          ${SITE.fullName} · ${SITE.city} · ${SITE.instagram}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function itemsTable(order: EmailOrder, t: (typeof COPY)[Locale]): string {
  const rows = order.items
    .map(
      (i) => `<tr>
        <td style="padding:6px 0;font-size:14px">${i.quantity} × ${i.nameSnapshot}</td>
        <td style="padding:6px 0;font-size:14px;text-align:right">${formatPrice(i.priceCents * i.quantity)}</td>
      </tr>`,
    )
    .join("")
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border-top:1px solid #e3dfd6;border-bottom:1px solid #e3dfd6">
    ${rows}
    <tr>
      <td style="padding:10px 0;font-weight:700">${t.total}</td>
      <td style="padding:10px 0;font-weight:700;text-align:right">${formatPrice(order.totalCents)}</td>
    </tr>
  </table>`
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#33584a;color:#fbf8f2;text-decoration:none;border-radius:999px;padding:12px 24px;font-size:14px;font-weight:600;margin-top:8px">${label}</a>`
}

async function send(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY no configurada — se omite: "${subject}" → ${to}`)
    return
  }
  const from = process.env.EMAIL_FROM ?? `${SITE.fullName} <onboarding@resend.dev>`
  try {
    const { error } = await new Resend(apiKey).emails.send({ from, to, subject, html })
    if (error) console.error("[email] Resend error:", error)
  } catch (err) {
    // un email fallido nunca debe tumbar un webhook o una acción
    console.error("[email] fallo al enviar:", err)
  }
}

function localeOf(order: EmailOrder): Locale {
  return order.locale === "en" ? "en" : "es"
}

export async function sendOrderConfirmation(order: EmailOrder): Promise<void> {
  if (!order.email) return
  const locale = localeOf(order)
  const t = COPY[locale]
  const n = formatOrderNumber(order.number)
  const html = layout(
    t.confirmTitle,
    `<p style="margin:0 0 4px;font-size:15px;line-height:1.5">${t.confirmIntro(order.name, n)}</p>
     ${itemsTable(order, t)}
     <p style="margin:0 0 8px;font-size:13px;color:#675f54">${t.rxNote}</p>
     ${button(trackPageUrl(order, locale), t.trackOrder)}
     <p style="margin:20px 0 0;font-size:13px;color:#675f54">${t.help}</p>`,
  )
  await send(order.email, t.confirmSubject(n), html)
}

/** Aviso interno de nueva venta al administrador (ADMIN_EMAIL). Siempre en español. */
export async function sendNewOrderNotification(
  order: EmailOrder & { phone?: string | null },
  pendingRx: boolean,
): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) return
  const n = formatOrderNumber(order.number)
  const items = order.items
    .map((i) => `<li>${i.quantity} × ${i.nameSnapshot}</li>`)
    .join("")
  const html = layout(
    `Nueva venta ${n} — ${formatPrice(order.totalCents)}`,
    `<p style="margin:0 0 8px;font-size:15px">Cliente: <strong>${order.name || "—"}</strong> · ${order.email}${order.phone ? ` · ${order.phone}` : ""}</p>
     <ul style="margin:0 0 8px;padding-left:18px;font-size:14px">${items}</ul>
     ${pendingRx ? `<p style="margin:0 0 8px;font-size:13px;color:#8a5c10"><strong>⚠ Fórmula pendiente</strong> — contactar al cliente.</p>` : ""}
     ${button(`${siteUrl()}/admin/orders`, "Ver en el panel")}`,
  )
  await send(adminEmail, `🛍 Nueva venta ${n} — ${formatPrice(order.totalCents)}`, html)
}

export async function sendOrderShipped(order: EmailOrder): Promise<void> {
  if (!order.email) return
  const locale = localeOf(order)
  const t = COPY[locale]
  const n = formatOrderNumber(order.number)
  const carrierLabel =
    order.carrier && isCarrier(order.carrier) ? CARRIERS[order.carrier].label : "—"
  const track = trackingUrl(order.carrier ?? null, order.trackingNumber ?? null)

  const shippingBlock =
    order.carrier === "LOCAL"
      ? `<p style="margin:0;font-size:14px">${t.localDelivery}</p>`
      : track
        ? `<p style="margin:0 0 4px;font-size:14px">${carrierLabel}: <span style="font-family:monospace">${order.trackingNumber}</span></p>
           ${button(track, t.trackPackage)}`
        : ""

  const html = layout(
    t.shippedTitle,
    `<p style="margin:0 0 12px;font-size:15px;line-height:1.5">${t.shippedIntro(order.name, n, carrierLabel)}</p>
     ${shippingBlock}
     <p style="margin:16px 0 0"><a href="${trackPageUrl(order, locale)}" style="color:#33584a">${t.trackOrder} →</a></p>
     <p style="margin:20px 0 0;font-size:13px;color:#675f54">${t.help}</p>`,
  )
  await send(order.email, t.shippedSubject(n), html)
}
