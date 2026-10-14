# PRICELIST

**One link. All your prices.**

PRICELIST is a digital storefront and price-list platform for businesses that sell through WhatsApp.
A business creates a store, adds products/services and prices, and receives a unique public URL
(e.g. `pricelist.ng/chuks-kicks`). Customers browse, build an order, and check out directly in
WhatsApp — no app, no account, no friction.

## Stack

- **Next.js 14** (App Router) + **TypeScript** (strict)
- **Tailwind CSS** — navy/luxury design system
- **Prisma** + SQLite (dev) / PostgreSQL (production — switch provider in `prisma/schema.prisma`)
- **NextAuth v4** — credentials auth, JWT sessions
- **Paystack** — subscription payments (architected; graceful dev mode when keys absent)
- Local object-storage abstraction (`lib/storage.ts`) — swap for S3/Cloudinary via env

## Quick start

```bash
npm install
npm run db:push          # create tables
npm run db:seed          # demo data (users, stores, products, orders)
npm run dev
```

Demo accounts (seeded):

| Role | Email | Password |
| --- | --- | --- |
| Business owner | demo@pricelist.ng | demo1234 |
| Admin | admin@pricelist.ng | admin1234 |

Public storefronts: `/chuks-kicks`, `/ada-beauty`, `/mama-t-kitchen`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | dev server |
| `npm run build` | generate Prisma client + production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | tsc --noEmit |
| `npm run test` | vitest (business logic: limits, cart, WhatsApp, orders, money) |
| `npm run db:seed` | seed demo data |

## Architecture notes

- **Money** is stored as integer minor units (kobo). Never floats. See `lib/money.ts`.
- **Plan limits** are enforced server-side in `lib/plans.ts` + product API routes.
- **Order snapshots**: `order_items` stores product name + price at purchase time.
- **Themes** are a config system (`lib/themes.ts`) — storefronts render via CSS variables;
  no per-theme hard-coded components.
- **WhatsApp**: click-to-chat URLs with encoded order messages (`lib/whatsapp.ts`);
  Business Platform integration point is isolated in the same module.
- **AI** (descriptions, logos) sits behind service abstractions with working offline
  fallbacks — the app is fully functional without API keys.
- **Auth**: users only modify their own businesses/products/orders; admin is
  server-side role-gated.
