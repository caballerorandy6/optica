# Mira Eyewear — Optical Store

**Bilingual online eyewear store for an independent optical shop in Houston** — frame catalog, lens and prescription options, virtual try-on with the camera, Stripe checkout, order tracking and an admin panel.

**Live demo:** [optica-dun.vercel.app](https://optica-dun.vercel.app)

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-7-2d3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169e1?logo=postgresql&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38b2ac?logo=tailwindcss)
![Stripe](https://img.shields.io/badge/Stripe-635bff?logo=stripe&logoColor=white)

## What it does

### Store (English and Spanish)
- **Catalog:** frames filtered by collection, material and color, with bestsellers, color variants, measurements and image galleries.
- **Lenses and prescription:** the customer picks a lens option (frame only, basic, anti-reflective, blue light…) and enters the prescription (SPH, CYL, axis, ADD for each eye) with validation, or sends it later.
- **Virtual try-on:** previews frames on the customer's face with the camera, using Jeeliz FaceFilter and Three.js (self-hosted in `public/vto`).
- **Cart and checkout:** Stripe Checkout; a webhook confirms the payment and creates the order.
- **Order tracking:** the customer finds the order with the order number and purchase email.
- **Emails:** order confirmation with Resend.

### Admin panel
- Login protected with a signed session (`jose`).
- Products: publish or hide frames and set sale prices.
- Orders: status flow `PENDING → PAID → SHIPPED → FULFILLED`, plus `CANCELLED` and `REFUNDED`.

### Catalog import
`npm run import:capri` imports the supplier catalog (about 578 frames with color variants and images) from the supplier's public WooCommerce Store API. Products come in unpublished and without price, so the shop decides what to sell and at what price. The script is safe to run again (upsert, no duplicates).

## Tech stack

| Area | Tools |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions), React 19, TypeScript |
| UI | Tailwind CSS 4, shadcn/ui (Radix), lucide-react |
| Data | PostgreSQL, Prisma 7 (`@prisma/adapter-pg`) |
| Payments | Stripe Checkout and webhooks |
| Email | Resend |
| i18n | next-intl (`en`, `es`) |
| Try-on | Jeeliz FaceFilter, Three.js |
| Testing | Vitest (checkout, Stripe webhook and admin actions) |
| Hosting | Vercel |

## Project structure

```
src/
  app/
    [locale]/      store pages: home, frames, cart, checkout, track, about
    admin/         login and panel (orders, products)
    api/stripe/    Stripe webhook
  components/      UI, product, cart and layout components
  lib/             Prisma client, Stripe, email, validation
messages/          translations (en, es)
prisma/            schema and migrations
scripts/           catalog import and sample publishing
tests/unit/        Vitest tests
```

## Getting started

**Requirements:** Node.js 20.9+ and PostgreSQL.

```bash
git clone https://github.com/caballerorandy6/optica.git
cd optica
npm install                 # also runs prisma generate
# create .env with the variables below
npx prisma migrate dev      # create the database tables
npm run import:capri        # optional: import the frame catalog
npm run dev                 # http://localhost:3000
```

### Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Secret used to sign the admin session |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Admin login |
| `NEXT_PUBLIC_SITE_URL` | Site URL, e.g. `http://localhost:3000` |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Payments |
| `RESEND_API_KEY`, `EMAIL_FROM` | Order emails |
| `DEMO_MODE` | `1` shows the demo admin access on the login page |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Generate the Prisma client, apply migrations and build |
| `npm run lint` | ESLint |
| `npx vitest` | Unit tests |
| `npm run import:capri` | Import the supplier catalog |
| `npm run publish:samples` | Publish up to 40 sample frames with test prices (development) |

## Author

**Randy Caballero** — Full-Stack Developer, Houston, TX
[rcweb.dev](https://rcweb.dev) · [LinkedIn](https://linkedin.com/in/caballerorandy) · [GitHub](https://github.com/caballerorandy6)
