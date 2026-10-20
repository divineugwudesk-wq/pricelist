# PRICELIST

**One link. All your prices.**

PRICELIST is a digital storefront and price-list platform for businesses that sell through WhatsApp.
A business creates a store, adds products/services and prices, and receives a unique public URL
(e.g. `pricelist.ng/chuks-kicks`). Customers browse, build an order, and check out directly in
WhatsApp — no app, no account, no friction.

## Stack

- **Next.js 15** (App Router) + **TypeScript** (strict)
- **Tailwind CSS** — the design tokens below
- **Prisma** + PostgreSQL (provider set in `prisma/schema.prisma`)
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

`NEXTAUTH_URL` and `APP_URL` must point at the address the dev server is
listening on, otherwise NextAuth redirects the sign-in to the configured host
and the session cookie is never set:

```bash
NEXTAUTH_URL=http://localhost:3000 APP_URL=http://localhost:3000 npm run dev
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
| `npm run build` | OpenNext production build for Cloudflare Workers |
| `npm run build:next` | Prisma generate + plain Next.js production build |
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
- **Cloudflare Workers**: Prisma runs with `engineType = "client"` (WASM query
  compiler) over a `pg` driver adapter, because the native engine cannot load
  inside workerd. `scripts/patch-prisma-client.mjs` runs as a Prisma
  `postgenerate` hook and moves the `workerd` export condition to the front of
  the generated client, so the bundle picks the Workers client instead of the
  Node.js one.

## Design system

The interface is built from a small set of tokens defined in `tailwind.config.js`.
Read them before adding a colour, radius or type size.

**Colour** — three ramps, each with a job:

| Ramp | Role |
| --- | --- |
| `navy` | The brand. Primary buttons, links, headings, active states, dark surfaces. Never a page background. |
| `neutral` | The interface. Almost every surface, border and divider. Warm and low-chroma. |
| `gold` | The accent. Wordmark, featured items, the recommended plan. Never a primary button. |

Status colours (`success`, `danger`, `warning`) each have a `DEFAULT` and a `.soft`
background. `whatsapp` is reserved for WhatsApp actions.

**Type** — `micro` 11, `caption` 13, `body` 14, `lead` 16, `title` 15,
`headline` 26, `display` 38. Three families: `font-sans` (Inter) for UI,
`font-heading` (Manrope) for headings, `font-serif` (Source Serif 4) for the
editorial touches. Fonts load from the Google Fonts stylesheet at runtime, so
there is no build-time network dependency.

**Shape** — radius scale `sm` 4 → `3xl` 20. Two shadows only: `soft` for
resting surfaces, `lift` for floating ones. Two motion tokens: `fade-in` and
`slide-up`, both under 200 ms, and both disabled under `prefers-reduced-motion`.

**Components** live in `components/ui` and take their appearance from these
tokens: `button`, `card`, `input`, `badge`, `dialog`, `toast`, `empty-state`,
`stat`, `switch`, `skeleton`, `metrics`. Use them instead of ad-hoc markup so
the app stays consistent.

**Storefront** themes (`lib/themes.ts`) are separate from the app tokens — a
store owner picks their own colours, and those are applied through CSS
variables, not Tailwind classes.
