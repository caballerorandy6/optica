import Stripe from "stripe"

let client: Stripe | null = null

/** Lazy para que el build no truene si la clave aún no está en el entorno. */
export function getStripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set")
    client = new Stripe(key)
  }
  return client
}
