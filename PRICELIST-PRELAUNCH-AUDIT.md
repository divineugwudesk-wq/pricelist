# PRICELIST — Pre-Launch Audit Report

**Product:** PRICELIST — mobile-first storefront / digital price-list platform for Nigerian businesses. Sellers create storefronts, publish products and prices, and customers build orders sent through WhatsApp.

**Audit date:** 20 October 2026
**Audit type:** Senior SaaS engineering pre-launch audit — read-only inspection
**Repository:** `C:\Users\ronaldo\Documents\PRICELIST`
**Target deployment:** Cloudflare Workers (OpenNext) + Supabase-hosted PostgreSQL (via Prisma)

---

## Audit constraints observed

- No application file was modified, created, or deleted **by this audit**. The repository *was* being modified in parallel by other work during the audit window; every such change is itemised in the working-tree note in Appendix A, and the findings in this report are stated against the working tree as of hand-off.
- No packages were installed.
- No database migrations were run and no Supabase settings were changed.
- No secrets, API keys, passwords, or environment-variable **values** are reproduced anywhere in this report. Only variable *names*, *schemes*, *ports*, and *lengths* are referenced where a value shape was needed to reach a conclusion. The one exception is the pair of **seeded demo logins** (`admin@pricelist.ng` / `demo@pricelist.ng`) in **C5** — those credentials are hardcoded in the tracked file `prisma/seed.ts:28-52`, are already published in the repository, and are named explicitly because the remediation is to delete and rotate them. They are not environment secrets and no `.env` value appears anywhere in this document.
- No destructive requests were issued and no other user's private data was accessed. Cross-tenant isolation is a **code-reading conclusion**, not a penetration result.
- The only database interaction was **read-only aggregate `count`/`groupBy` queries** run through Prisma, returning counts and enum distributions only.

---

## 0. Executive summary

### The core product loop is genuinely built and works

Storefront → catalogue → cart → WhatsApp order → persisted order with price snapshots → merchant order history. This is real, coherent, well-tested business logic. The money model (integer kobo, never floats), the cart arithmetic, the WhatsApp message builder, and the server-side ownership scoping are the strongest parts of the codebase.

### The commercial and account-recovery layers are not production-ready

Every one of the five launch blockers sits in **billing, email, or credential hygiene** — not in the storefront. Specifically:

- Password reset **never sends an email** — the mail function is a stub.
- The "subscription" is a **one-time charge** that never renews, and the post-payment return path **never activates the plan**.
- With the Paystack key unset (which is the case in the current `.env`), **any signed-in user can grant themselves Pro for free**.
- The live database contains **seeded accounts with published passwords**, including a platform admin.
- A **destructive `supabase-init.sql` script that drops all ten tables** sits untracked in the repository root.
- The **deployed Worker cannot open a verifiable TLS connection to Supabase**. The remedy (Hyperdrive + an uploaded CA) is now documented in `wrangler.toml` and supported in `lib/db.ts`, but the binding is still commented out, so the Worker falls back to `DATABASE_URL` with certificate verification disabled.

### One important correction to the original brief

The brief describes the stack as "Next.js and Supabase." **Supabase is the database host, not the application layer.** There is no `@supabase/supabase-js`, no Supabase client, no `supabase/` directory, and no RLS/SQL policy files in the tracked codebase. The application reaches Supabase-hosted Postgres **exclusively through Prisma** using a single `DATABASE_URL`.

This materially changes the security answer: **there is no Row Level Security, and no database-level tenant isolation of any kind.** Every authorization decision is a line of application code. The `supabase-init.sql` script found during this audit confirms this directly — it creates the tables with foreign keys and indexes but contains **no `ENABLE ROW LEVEL SECURITY`, no `CREATE POLICY`, and no `GRANT`/`REVOKE` statements**.

### Readiness verdict

| Area | Verdict |
|---|---|
| Architecture | **Ready.** Clean App Router layout, well-factored `lib/` service layer, two coherent design systems. |
| Storefront & orders | **Ready.** Correct, server-authoritative pricing with price snapshots. Two defects (H14, M19). |
| Authentication | **Mostly ready.** Session/ownership model is sound. Reset flow is broken (C1). |
| Authorization / tenancy | **Ready in code, absent in the database.** App-layer scoping is correct and consistent; there is no DB backstop. |
| Subscription billing | **Not ready.** Architecturally present, functionally broken end to end (C2, C3, C4). |
| Analytics | **Partially ready.** Events are recorded, but two of three metrics are wrong (M19, M20). |
| Infrastructure / DB | **Not ready.** No migrations (H13), destructive SQL in the repo (C6), the Hyperdrive remedy for the Workers TLS trust problem is documented but not enabled (C7), verification disabled (H17), secret-file ignore rules too narrow (H18). |
| Testing | **Adequate for pure logic, absent for everything else.** 57 passing tests, all against pure functions plus one live-DB call. No CI. |

**Recommendation: do not launch the pricing page or open registration to the public until findings C1–C7 are closed.**

---

# 1. ARCHITECTURE

## 1.1 Framework and dependency versions

| Component | Version | Notes |
|---|---|---|
| Next.js | `^15.5.28` (build log confirms 15.5.28) | App Router, `output: "standalone"` |
| React / React DOM | `18.3.1` | |
| TypeScript | `5.7.2` | `strict: true` (`tsconfig.json`) |
| Tailwind CSS | `^3.4.17` | + PostCSS 8.4.49, autoprefixer 10.4.20 |
| NextAuth | `4.24.11` | v4 — Credentials provider, JWT session strategy |
| Prisma | `^6.19.3` | `engineType = "client"` (WASM query compiler) |
| `@prisma/adapter-pg` | `^6.19.3` | + `pg` `^8.16.3` driver adapter |
| Zod | `3.24.1` | shared client/server validation |
| bcryptjs | `2.4.3` | password hashing, cost 10 |
| qrcode | `1.5.4` | server-side QR data URLs |
| lucide-react | `0.469.0` | icons |
| clsx / tailwind-merge | 2.1.1 / 2.6.0 | via `cn()` in `lib/utils.ts` |
| @opennextjs/cloudflare | `^1.20.12` | Cloudflare Workers build |
| wrangler | `^4.151.0` | |
| Vitest | `2.1.8` | |

## 1.2 Application structure

```
app/                        App Router — no route groups, no parallel/intercepting routes
  page.tsx                  landing page (client component)
  [slug]/page.tsx           PUBLIC STOREFRONT — top-level dynamic segment
  login|register|forgot-password|reset-password|onboarding/
  dashboard/                overview, products, products/new, products/[id]/edit,
                            categories, orders, analytics, store, billing, settings
  admin/page.tsx
  api/**/route.ts           24 route handlers

components/
  ui/                       button, card, input, badge, dialog, toast, empty-state,
                            stat, switch, skeleton, metrics
  storefront/               cart-context, cart-drawer, product-card, storefront-client,
                            storefront-header, overlays, sample-store
  dashboard-layout.tsx, auth-shell.tsx, brand.tsx

lib/                        domain + service layer
  auth.ts                   NextAuth config
  server-auth.ts            authorization choke point
  db.ts                     request-scoped Prisma client
  orders.ts cart.ts money.ts whatsapp.ts       pure/domain logic
  plans.ts plan-data.ts db-types.ts            plan model
  analytics.ts analytics-client.ts              event recording
  storefront.ts storefront-utils.ts themes.ts   public read model + theming
  validation.ts             Zod schemas
  paystack.ts paystack-body.ts                  payments
  storage.ts email.ts password-reset.ts ai.ts logo.ts qr.ts utils.ts
  __tests__/ cart/__tests__/ money/__tests__/ plans/__tests__/ whatsapp/__tests__/

prisma/                     schema.prisma, seed.ts   ← NO migrations/ directory
scripts/                    patch-prisma-client.mjs, probe-worker/
```

## 1.3 Routing approach

- **App Router** throughout. API route handlers under `app/api/**/route.ts`, all declaring `export const dynamic = "force-dynamic"`.
- `app/[slug]/page.tsx` is a **top-level dynamic segment**, so every unmatched top-level path attempts a storefront lookup and 404s if no business matches.
- Static routes take priority over `/[slug]`, but the page carries a **hardcoded `reserved` slug array** rather than deriving conflicts from the route tree — see finding **M27**.
- `middleware.ts` — `withAuth` matcher on `/dashboard/:path*`, `/onboarding/:path*`, `/admin/:path*`. It checks only for the *presence* of a token; role and ownership are re-verified server-side, which is the correct arrangement.
- **Verified via build artifacts:** `.next/routes-manifest.json` lists `/[slug]` under `dynamicRoutes` with no fallback, and `.next/server/app/[slug]/` contains **no `.html` / `.rsc` / `.meta` prerender artifact** — unlike the client-component pages, which do. The storefront is therefore **rendered on demand per request**, not statically cached.

## 1.4 Styling system

Two independent, deliberately separate systems:

1. **App design system** — `tailwind.config.js`. Three colour ramps: `navy` (brand — primary actions, links, headings), `neutral` (interface — nearly every surface, border, divider), `gold` (accent — wordmark, featured items, recommended plan). Plus `ink` / `surface` / `success` / `danger` / `warning` / `whatsapp`. Semantic type scale (`micro` 11 → `display` 38), two shadows only (`soft`, `lift`), four animations, a 4px→20px radius scale, three font families (Inter / Manrope / Source Serif 4). Consumed via `cn()` = `clsx` + `tailwind-merge` inside `components/ui/*`.
2. **Storefront themes** — `lib/themes.ts`. Seven themes (`classic`, `luxury`, `minimal`, `dark`, `fashion`, `restaurant`, `modern`) as pure data, injected as CSS custom properties (`--pl-bg`, `--pl-primary`, …) in `components/storefront/storefront-client.tsx:154-167`. **No per-theme components** — a genuinely good decision, and a 7-theme system that costs almost nothing to maintain.

Fonts load from the Google Fonts stylesheet **at runtime**, so there is no build-time network dependency.

## 1.5 Deployment architecture

- `wrangler.toml` → Cloudflare **Workers**, `compatibility_date = 2026-10-16`, flags `nodejs_compat` and `global_fetch_strictly_public`. R2 incremental-cache binding, `IMAGES` binding, `WORKER_SELF_REFERENCE` service binding.
- `lib/db.ts` creates a **request-scoped** Prisma client and `pg` pool per request — required, because Workers forbids sharing a TCP socket across requests. OpenNext's per-request `AsyncLocalStorage` (exposed as `globalThis[Symbol.for("__cloudflare-context__")]`) is used as the request scope. The scope also carries `env`, which is what makes a Hyperdrive binding reachable (`lib/db.ts:78-84`).
- `scripts/patch-prisma-client.mjs` — a `postinstall`/`postgenerate` hook that moves the `workerd` export condition to the front of the generated Prisma client's import map, so the Workers (WASM) flavour is bundled rather than the Node flavour. Well documented and genuinely necessary.
- `next.config.js` — `output: "standalone"`, `images.unoptimized: true` (a consequence of the data-URL image approach, see H9), `outputFileTracingIncludes` for the Prisma WASM compiler, Node polyfill shims, and three security response headers.

---

# 2. AUTHENTICATION

**Overall: sound, with one completely broken flow (password reset).**

| Concern | Implementation | Evidence |
|---|---|---|
| Registration | `POST /api/auth/register` → bcrypt hash → `prisma.user.create` with `role: "USER"` | `app/api/auth/register/route.ts:52-59` |
| Registration validation | name ≥ 2, email regex, password ≥ 8, duplicate email → 409 | `app/api/auth/register/route.ts:17-50` |
| Login | NextAuth `CredentialsProvider`; bcrypt compare; `suspended` users rejected | `lib/auth.ts:46-60` |
| Session strategy | JWT, `maxAge: 30 days`; `id` / `role` / `suspended` in the token; `id` / `role` in the session | `lib/auth.ts:37`, `lib/auth.ts:64-78` |
| Session re-verification | `getCurrentUser()` re-reads the user from the DB and rejects `suspended`, so **suspension takes effect immediately** despite JWT caching | `lib/server-auth.ts:13-25` |
| Logout | `signOut({ callbackUrl: "/" })` from `next-auth/react` | `components/dashboard-layout.tsx:242, 321` |
| Route protection | `withAuth` middleware **plus** `getCurrentUser()` in every API handler | `middleware.ts`; all of `app/api/**/route.ts` |
| Password reset — token | 32 random bytes → SHA-256 → stored hashed, 1-hour expiry, single-use, prior tokens deleted on issue | `lib/password-reset.ts:18-38` |
| Password reset — email | `sendEmail()` — **stub, sends nothing.** See finding C1. | `lib/email.ts:11-18` |
| OAuth | `lib/oauth-stub.js` exists but is **not** wired into `authOptions` | `lib/auth.ts:36-81` |

## Verified gaps

- No password **change** for a logged-in user (only the reset flow, which is broken).
- No email verification on registration.
- No MFA.
- No session invalidation on password change — JWTs live 30 days and survive a reset.
- No account deletion (the settings page offers only business-profile editing).
- No login lockout or backoff — `bcrypt.compare` is called for every attempt, with no attempt counter.

---

# 3. DATABASE

## 3.1 Schema — `prisma/schema.prisma` (194 lines, 9 models)

```
User ──1:1── Business ──1:N──┬─ BusinessHours
                              ├─ Category ──1:N── Product
                              ├─ Product
                              ├─ Order ──1:N── OrderItem
                              └─ AnalyticsEvent
User ──1:1── Subscription
User ──1:N── PasswordResetToken
```

| Model | Notable fields | Constraints / indexes |
|---|---|---|
| `User` | `email @unique`, `role String`, `suspended Boolean` | `@@index([email])` — redundant with `@unique` |
| `Business` | `userId @unique`, `slug @unique`, `theme`, `accentColor`, `showBranding`, `heroImageUrl`, `suspended` | `@@index([slug])` — redundant |
| `BusinessHours` | `day` (0 = Monday), `isOpen`, `opensAt` / `closesAt` as `"HH:MM"` strings | `@@unique([businessId, day])` ✓ |
| `Category` | `name`, `sortOrder` | `@@unique([businessId, name])` ✓ |
| `Product` | `price Int` (kobo), `salePrice Int?`, `images String?` (JSON blob), `type`, `sku`, `isAvailable`, `isFeatured` | `@@unique([businessId, slug])` ✓ |
| `Order` | `subtotal` / `discount` / `total` (kobo), `status`, `source`, `sessionId` | `@@index([businessId, createdAt])`, `@@index([businessId, status])` ✓ |
| `OrderItem` | `productNameSnapshot`, `priceSnapshot`, `quantity`, `subtotal` | snapshot-at-purchase ✓, `@@index([orderId])` |
| `Subscription` | `userId @unique`, `plan`, `status`, `provider`, `providerCustomerId`, `providerSubscriptionId`, `startDate`, `renewalDate` | |
| `AnalyticsEvent` | `eventType`, `productId?`, `sessionId?`, `metadata?` (JSON) | `@@index([businessId, eventType, createdAt])` ✓ |
| `PasswordResetToken` | `tokenHash @unique`, `expiresAt` | ✓ |

**Money is stored as integer kobo throughout — never floats.** `lib/money.ts` (`parseNairaToKobo`, `formatNaira`, `lineTotal`) and `lib/cart.ts` (`effectivePrice`, `calculateCart`) enforce this, and `calculateCart` clamps quantity to `[1, 999]` and lines to 200. This is the strongest part of the codebase.

`role`, `plan`, `status`, `eventType`, `type` and `category` are all free-text `String` columns with **no database constraint** — see finding **M26**.

## 3.2 Migrations — **absent**

There is **no `prisma/migrations/` directory**. The schema was applied with `prisma db push` only. `DATABASE_STATUS.txt:4` records that `prisma migrate deploy` **fails with P1001 (cannot reach server)**, and `package.json` exposes `db:push` / `db:migrate` as the only migration scripts.

Consequences: the production schema is not reproducible, not reviewable in diffs, and cannot be deployed to a fresh database. See finding **H13**.

## 3.3 A destructive bootstrap script exists in the repository root

`supabase-init.sql` (untracked, 267 lines) was found during the audit. It:

- **`DROP TABLE IF EXISTS … CASCADE` for all ten tables** (`supabase-init.sql:1-11`), then recreates every table, index and foreign key by hand as a `db push`-style dump.
- Contains **no `ENABLE ROW LEVEL SECURITY`, no `CREATE POLICY`, and no `GRANT` / `REVOKE`** — direct confirmation of the missing database-level isolation described in **§4.1**.
- Is named such that an operator would plausibly run it against the live Supabase project to "initialise" it. Running it would **destroy all live data**: users, businesses, products, orders, analytics events and subscriptions.

See finding **C6**. The database currently still holds its data (4 users, 3 businesses, 14 products, 3,019 events), so the script has not been run against production — yet.

## 3.4 Data access patterns

- `lib/db.ts` — a request-scoped Prisma client exposed behind a `Proxy`, so call sites keep the natural `prisma.user.findMany(...)` shape. Pool `max: 1`, `ssl.rejectUnauthorized: false`, and `sslmode` stripped from the connection string. `resolveConnectionString` (`lib/db.ts:78-84`) prefers `scope.env.HYPERDRIVE.connectionString` and falls back to `process.env.DATABASE_URL`; the OpenNext request context does carry `env`, so the Hyperdrive path is structurally correct — but the binding it depends on is still commented out (**C7**).
- `scripts/patch-prisma-client.mjs` — see §1.5.
- **All tenant scoping uses the Prisma relation filter** `where: { business: { userId: user.id } }`. This is consistent and correct across products, categories, orders, businesses, logo, customize, subscription, analytics and admin.

## 3.5 Live database state (read-only aggregate queries)

```
users            4   (1 with role = ADMIN)
businesses       3   (0 suspended)
products        14   (0 with an image, 0 with an inline data URL)
orders           1   (status NEW)
analyticsEvents  3019   STORE_VIEW 1872 · PRODUCT_VIEW 928 · WHATSAPP_CLICK 219
subscriptions    3   all FREE / ACTIVE / provider="manual"
                    ← no paid subscription has ever been created
themes           classic ×1, luxury ×1, restaurant ×1
                    ← 2 of 3 businesses use Pro-only themes on FREE plans
live password-reset tokens  0
```

This is the **seeded demo dataset**, living in the same database the deployed application points at. See findings **C5** and **M26**.

---

# 4. SECURITY

## 4.1 Row Level Security — not applicable, and that *is* the finding

PRICELIST is a single-role Prisma application. The `DATABASE_URL` points at a Supabase-hosted Postgres project and the role is the table owner (per the connection strings in `DEPLOYMENT_GUIDE.txt:15-21`). There are:

- **no RLS policies**,
- **no `ENABLE ROW LEVEL SECURITY` on any table** (confirmed by `supabase-init.sql`),
- **no restricted read-only role**,
- **no per-tenant Postgres roles**,
- **no `SECURITY DEFINER` functions or views**.

Even if policies were added, the application role owns the tables and would bypass them. **Every tenant-isolation guarantee in PRICELIST is a single line of application code.** The app-layer scoping is good (§4.2), but there is no database backstop: a single missed `where` clause anywhere exposes another tenant's data.

**Recommendation:** enable RLS on every table as a defence-in-depth layer with a restrictive default policy, and add a second, application-level Postgres role restricted to the operations the app actually performs.

## 4.2 Server-side authorization — **solid**

`lib/server-auth.ts` is the choke point and the design is right:

- `getCurrentUser()` — session + live DB re-read; rejects suspended users.
- `requireUser()` / `requireAdmin()` — throw `UnauthorizedError` (401) / `ForbiddenError` (403).
- `getOwnedBusiness(userId, businessId)`, `getOwnedProduct(userId, productId)`, `getOwnedOrder(userId, orderId)` — the file comment states the rule and the code follows it: *never trust a client-supplied id*.

**No cross-account access path was found in any route read.** Every mutation re-scopes through `business: { userId: user.id }` or the owner's own `businessId` before touching data:

- `app/api/products/route.ts`, `app/api/products/[id]/route.ts`, `app/api/products/[id]/duplicate/route.ts` — owner-scoped ✓
- `app/api/products/bulk/route.ts:40-44` — re-scopes the client's `productIds` to owned ids **before** any `deleteMany` / `updateMany` ✓
- `app/api/categories/route.ts`, `app/api/categories/[id]/route.ts` — owner-scoped ✓
- `app/api/orders/route.ts:29-47` — **derives `businessId` from the products, never from the request body**, and rejects mixed-store carts ✓
- `app/api/businesses/route.ts`, `app/api/businesses/[id]/route.ts`, `.../logo`, `.../customize` — owner-scoped ✓
- `app/api/analytics/route.ts:50-59` — the GET summary requires `businessId` to match `userId` ✓
- `app/api/admin/route.ts` — `requireAdmin()` on **every** method (`:13, 72, 98, 124, 168`) ✓
- `app/admin/page.tsx` performs a client-side role check, but every data call is server-gated — the client check is cosmetic only, which is correct ✓

## 4.3 Public storefront access

`lib/storefront.ts:59-73` returns only the fields the storefront needs, filtered to `products where isAvailable`, and 404s for `suspended` businesses. The public surface is appropriately narrow — it exposes no user email, no customer data, and no order data.

**Gap:** `POST /api/orders` does **not** check `business.suspended`. A suspended business's storefront 404s, but its API still accepts and persists orders. See **M29**.

## 4.4 Input validation — **good**

Zod schemas in `lib/validation.ts` are shared between client and server, all `.strict()` (unknown keys rejected), with sensible bounds:

- `priceKobo` — integer, ≥ 1, ≤ 1e11
- `salePriceKobo` — integer, and refined to be strictly below `priceKobo`
- `quantity` — integer 1–999; `items` — 1–200 entries
- `name` / `description` / `sku` / address — length-capped
- Social URLs and phone numbers — regex-validated

Password hashing uses bcrypt at cost 10. Password reset tokens are 32 cryptographically random bytes, stored **hashed** (SHA-256), single-use, with a 1-hour expiry.

## 4.5 Gaps

| Area | Finding |
|---|---|
| Rate limiting | **None anywhere.** `/api/orders`, `/api/analytics`, `/api/auth/register`, `/api/auth/forgot-password` are all unbounded public endpoints — **H10** |
| User enumeration | `forgot-password` returns the reset link **only when the account exists** — **H8** |
| Analytics integrity | `POST /api/analytics` accepts an arbitrary `businessId` with no authentication; the code comment describes a rate guard that does not exist — **H11** |
| Database isolation | No RLS, no restricted role — **§4.1** |
| Upload validation | The client-declared `Content-Type` is trusted; file bytes are never inspected — **M30** |
| TLS | `sslmode=no-verify` in the connection string is stripped and `rejectUnauthorized: false` is forced — **H17** |
| Response headers | `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy` are set. **No CSP, no HSTS, no Permissions-Policy** — **M24** |
| CSRF | No explicit CSRF tokens. Mitigated in practice by JSON-only request bodies (forcing a CORS preflight) and NextAuth's `SameSite=Lax` cookie — but by accident, not by design — **M28** |

**Not tested, by instruction:** no cross-tenant access attempt, no destructive request, no access to another user's data.

---

# 5. STOREFRONTS AND PRODUCTS

## 5.1 Store creation and slug generation

`POST /api/businesses` (`app/api/businesses/route.ts:40-108`) validates with `businessSchema`, creates the business **and** its 7 default `BusinessHours` rows, and returns the generated slug.

`uniqueSlug(base, existing)` (`lib/utils.ts:18-24`):
1. `slugify()` — lowercase → NFKD normalise → strip combining accents → non-alphanumeric to `-` → trim → cap at 60 characters.
2. On collision, append a random 4-character base-36 suffix, with a second random attempt.

**Issues:**
- The `existing` slug set is read and the insert happens separately → a TOCTOU race on the `slug @unique` constraint surfaces as an unhandled 500 rather than a retry.
- **No reserved-slug validation at creation time.** A business named "Admin" is assigned slug `admin`; `app/[slug]/page.tsx:47-53` then redirects that storefront to `/admin`, making the store permanently unreachable. The `reserved` list is a hand-maintained literal that will drift from the route tree — **M27**.
- Slugs are **immutable**, so printed and shared links keep working. This matches the landing-page FAQ copy. ✓

## 5.2 Products and images

| Operation | Plan limit enforced | Category ownership verified | Notes |
|---|---|---|---|
| `POST /api/products` | ✓ `app/api/products/route.ts:79-96` | ✓ `:99-110` | `salePrice` persisted only when strictly lower than `price` (`:126-129`) |
| `PATCH /api/products/[id]` | n/a (edit, not create) | ✓ `:73-81` | owner-scoped; re-validates sale-price ordering (`:83-92`) |
| `DELETE /api/products/[id]` | n/a | n/a | owner-scoped ✓ |
| `POST /api/products/[id]/duplicate` | ✓ `:30-47` | inherited | correctly counts against the limit ✓ |
| `POST /api/products/bulk` | n/a — no bulk **create** | n/a | only `delete` / `availability` / `featured`; ids re-scoped ✓ |
| `POST /api/categories` | ✓ `app/api/categories/route.ts:55-71` | n/a | |

**Image storage is the weak point.** `lib/storage.ts:76` returns `data:${contentType};base64,${base64Data}` — the **entire image is stored as a base64 string inside `Product.imageUrl`** (and `Business.logoUrl` / `Business.heroImageUrl`). A 5 MB upload becomes a ~6.7 MB base64 blob in a Postgres row, inlined into the storefront HTML and the RSC payload. `storeImageS3()` (`lib/storage.ts:82-91`) throws *"the S3 client is not wired in this environment"*, so setting `STORAGE_PROVIDER=s3` **breaks all uploads** outright. The live database currently has **zero products with images**, so this path has never been exercised with real data. See **H9**.

## 5.3 Public storefront rendering

- `getStorefront(slug)` (`lib/storefront.ts:59-119`) — one query with `include: { hours, categories, products where isAvailable }`, returning a whitelisted projection. Suspended businesses 404. ✓
- `app/[slug]/page.tsx` — `generateMetadata` (OpenGraph / Twitter / canonical) plus the page body. **Confirmed via build artifacts** to be a dynamic route rendered on demand.
- Rendering is `components/storefront/storefront-client.tsx` (client component). Cart state lives in `components/storefront/cart-context.tsx`, persisted per store in `localStorage` under `cart-<slug>`, and **prunes items whose product no longer exists** (`cart-context.tsx:70`).
- `generateMetadata` swallows errors and returns "Store not found | PRICELIST" for an unknown slug — acceptable.
- The page performs **two full `getStorefront` queries per request** (one in `generateMetadata`, one in the body) and **writes an analytics row during render** — see **M21**.

---

# 6. WHATSAPP ORDERING

## 6.1 The flow, traced end to end

1. **`ProductCard` "+" button** → `cart.add(productId)` → React state, persisted to `localStorage`.
2. **`CartDrawer`** → totals from `calculateCart()` — integer kobo, quantity clamped to 1–999, max 200 lines.
3. **`CheckoutModal.placeOrder()`** (`components/storefront/cart-drawer.tsx:206-263`):
   - `POST /api/orders` with `{ items: [{ productId, quantity }], customerName, customerPhone, customerNote, sessionId }`. **No prices are sent by the client.**
   - **Server** (`app/api/orders/route.ts`): Zod `checkoutSchema` → resolve products → **derive `businessId` from the products** → reject mixed-store carts → `createOrder()`.
   - **`lib/orders.ts:31-92`**: re-fetches products from the DB with `isAvailable: true`, **snapshots product name and price into `order_items`**, computes totals with `calculateCart`, writes `Order` + nested `OrderItem[]` in a single transaction, then records a `WHATSAPP_CLICK` event.
   - **Client** then builds the WhatsApp payload and calls `buildWhatsAppOrderUrl()` → `https://wa.me/<234…>?text=<encoded>` → `window.open()`.
4. **`lib/whatsapp.ts`**:
   - `normalizeWhatsAppNumber` — `0`-prefix → `234…`; 10-digit → `234…`; `+234…` → `234…`; rejects anything failing `/^\d{11,15}$/`.
   - `buildOrderMessage` — per-line name, quantity, price, subtotal; optional discount line; `TOTAL:`; optional customer name / phone / note; `Sent via PRICELIST.`
   - `buildWhatsAppOrderUrl` returns `null` for an invalid number; the client surfaces an explicit error. ✓
5. **Merchant side** — `/dashboard/orders` lists the merchant's orders, shows the snapshot line items, and supports the status workflow NEW → CONTACTED → CONFIRMED → COMPLETED / CANCELLED, plus a "Reply on WhatsApp" action that opens a chat with the customer's number (`app/dashboard/orders/page.tsx:104-115`).

## 6.2 Answers to the specific questions asked

- **How are product quantities constructed?** Client-held, clamped client-side, and **re-clamped server-side** by `calculateCart`; validated 1–999 by Zod. ✓
- **How are prices constructed?** The client never sends a price. The **server re-reads prices from the database** and ignores anything client-supplied. ✓ *This is the single most important correctness property in the order path, and it is right.*
- **How are totals constructed?** Integer kobo, computed server-side from database prices via `calculateCart`. ✓
- **Are orders persisted to the database?** **Yes.** `Order` + `OrderItem` rows are written *before* the WhatsApp link is opened, with name and price snapshots so historical orders remain correct when products change later. ✓

## 6.3 Defects in this flow

- **H14 — the WhatsApp message shows the wrong price for sale items.** `cart-drawer.tsx:237-249` passes `priceKobo: l.priceKobo` (the **list** price) but `subtotalKobo: l.lineTotalKobo` (computed from the **effective/sale** price). A sale item produces a message reading `Price: ₦85,000` followed by `Subtotal: ₦72,000` — confusing to the seller, who may quote the wrong amount. **The database order is correct** (`priceSnapshot` uses `effectivePrice`); only the outbound message is wrong.
- **L31 — `Order.discount` stores savings, not a discount.** `Order.subtotal` is already the net amount and `Order.total === Order.subtotal`, yet the dashboard renders them as `Subtotal / −Sale savings / Total` (`app/dashboard/orders/page.tsx:221-236`). The column name is misleading for future reporting.
- **H10 / M29** — the endpoint is unauthenticated and unrated, and does not check `business.suspended`.

---

# 7. SUBSCRIPTION PLANS

## 7.1 How the plans are represented

`lib/plan-data.ts` holds pure, client-safe plan definitions; `lib/plans.ts` adds server-side resolution.

| | Free | Starter | Pro |
|---|---|---|---|
| `priceKobo` | 0 | 150,000 (₦1,500) | 300,000 (₦3,000) |
| `maxProducts` | 5 | 50 | `null` (unlimited) |
| `maxCategories` | 5 | 25 | `null` |
| `themeAccess` | `"free"` | `"free"` | `"all"` (all 7 themes) |

`getActivePlan(userId)` (`lib/plans.ts:23-28`) reads the `Subscription` row and returns the plan **only if `status` is `ACTIVE` or `TRIALING`** — otherwise `"FREE"`. It **never inspects `renewalDate`**. That omission is the root of C3.

## 7.2 What is actually enforced server-side

| Feature | Enforced at | Verdict |
|---|---|---|
| Product limit | `app/api/products/route.ts:79-96`; `app/api/products/[id]/duplicate/route.ts:30-47` | ✓ `403` with `code: "PLAN_LIMIT"` and upgrade metadata |
| Category limit | `app/api/categories/route.ts:55-71` | ✓ |
| Pro themes | `app/api/businesses/[id]/customize/route.ts:44-57` → `canUseTheme` | ✓ `403 THEME_PRO_ONLY` |
| Remove PRICELIST branding | same route, `:61-73` → `plan !== "PRO"` | ✓ `403 BRANDING_PRO_ONLY` |
| Hero / banner image | same route, `:77-88` → `plan !== "PRO"` | ✓ `403 HERO_PRO_ONLY` |
| **Accent colour** | same route, `:58-60` — **no plan check** | ✗ **H15** |

**H15 in detail.** Accent colour is advertised as Pro-only in three places: the landing-page pricing table (`app/page.tsx:102`), the Pro feature list (`lib/plan-data.ts:73`), and the dashboard UI (`app/dashboard/store/page.tsx:247-251`, which blocks it client-side). But the **server accepts `accentColor` from any plan** — the only guard is a client-side `if (!isPro)`. A Free user can simply `PATCH /api/businesses/:id/customize {"accentColor":"#7A2E4D"}` and receive it. This also violates the file's own stated rule at `lib/plan-data.ts:22-23`: *"If a capability is not enforced in code, it does not belong here."*

## 7.3 Payment integration — present in architecture, broken in function

There **is** a Paystack integration (`lib/paystack.ts`, `app/api/billing/**`), so the landing page is not merely advertising a nonexistent feature. But it is not a subscription system:

- **C3 — it is a one-time charge, not a subscription.** `initializeSubscriptionCheckout` calls `POST /transaction/initialize` (`lib/paystack.ts:58-72`) — a **single payment**. Paystack recurring billing requires a Paystack *Plan* (`plan_code`) or the Subscription API; neither is used. The app then *fakes* a renewal locally: `applySuccessfulPayment` sets `renewalDate = now + 1 month` (`lib/paystack.ts:129-131, 141`) — but **nothing ever renews it, and `getActivePlan` never reads it**. Net effect: **a user pays ₦1,500 once and holds Starter forever.**
- **C4 — the post-payment return path never activates the plan.** `callback_url` is `${APP_URL}/dashboard/billing?paystack=success` (`lib/paystack.ts:69`), but `app/dashboard/billing/page.tsx` **never reads `paystack=success`** and never calls `PUT /api/billing/checkout` with the `reference` — `upgrade()` only handles the `mode === "paystack"` *redirect* (`:98-101`). The `PUT` verification branch (`app/api/billing/checkout/route.ts:87-107`) is therefore **unreachable from the browser**. The only path that grants a paid plan is the **webhook**, which requires the webhook to be registered in the Paystack dashboard — not verifiable from the repository. If it is not registered, **customers pay and receive nothing**.
- **C2 — production can grant paid plans for free.** `PUT /api/billing/checkout` falls through to `activatePlanDevMode(user.id, plan)` whenever `PAYSTACK_SECRET_KEY` is unset (`app/api/billing/checkout/route.ts:116-121` → `lib/paystack.ts:157-182`), writing `status: "ACTIVE"`, `provider: "dev"`. The guard is only *"is the key present"* — and **the current `.env` has `PAYSTACK_SECRET_KEY` empty**. Any authenticated user can self-upgrade to Pro for free. The billing UI does label it "Development mode" (`app/dashboard/billing/page.tsx:103-106`), but a client-side `window.confirm` is not a security control.
- **C5 — no amount verification.** `verifyPaystackTransaction` is checked for `status === "success"` and `metadata.userId === user.id`, but the **amount is never compared to `PLANS[plan].priceKobo`**. Defence-in-depth gap.
- **Webhook gaps** (`app/api/billing/webhook/route.ts`): HMAC-SHA512 signature verification with a constant-time compare ✓ (`lib/paystack.ts:97-106`) — but `subscription.disable` is an **empty block** (`:46-48`), and there is no handling of `subscription.create`, `subscription.renew`, `invoice.create`, or `charge.failed`. A cancellation at Paystack would never downgrade the user.
- **H12 — a cancelled subscription can never be re-bought.** `POST /api/billing/checkout` reads `current?.plan` (the **plan string**, not the status) and rejects if the target is ≤ the current plan (`app/api/billing/checkout/route.ts:37-47`). Cancelling sets `status = "CANCELLED"` but leaves `plan = "PRO"`, so every future purchase attempt is rejected with *"You already have this plan or higher."* The user is stuck on Free forever with no way to resubscribe.
- **H16 — cancelling downgrades immediately, contradicting the UI.** `POST /api/subscription` sets `status = "CANCELLED"` (`app/api/subscription/route.ts:62-65`), and `getActivePlan` then returns `FREE` immediately, while the UI promises *"You'll keep your plan until the end of the billing period, then return to Free"* (`app/dashboard/billing/page.tsx:132, 146`). Paystack is never told to cancel.
- No plan-change proration, no invoice or receipt page, no dunning for failed renewal, no scheduled job to expire lapsed subscriptions.

## 7.4 Landing page versus reality

`app/page.tsx:380+` presents a full pricing table, and the FAQ states *"PRICELIST only handles the subscription."* The subscription is not yet functional. **Do not launch the pricing page as-is.**

---

# 8. ANALYTICS

## 8.1 Which events are actually recorded

| Event | Where recorded | Trigger | Verified |
|---|---|---|---|
| `STORE_VIEW` | `app/[slug]/page.tsx:63-66` | server-side, during render | ✓ once per request |
| `PRODUCT_VIEW` | `components/storefront/storefront-client.tsx:136-145` → `POST /api/analytics` | when a customer opens a product modal | ✓ |
| `WHATSAPP_CLICK` | **two places** — `lib/orders.ts:81-84` (server, on order creation) **and** `components/storefront/cart-drawer.tsx:253` (client) | on "Send order on WhatsApp" | ✓ but **double-counted** — M19 |
| Order lifecycle events | **none.** There is no `ORDER_CREATED` / `ORDER_STATUS_CHANGED` event type. Order analytics are derived by querying the `Order` table, not from `AnalyticsEvent`. | — | — |

## 8.2 Aggregation

`getStoreAnalytics(businessId, range)` (`lib/analytics.ts:56-116`) loads **all** event rows in the range into memory, aggregates in JavaScript, resolves product names, and buckets by calendar day. Owner-scoped ✓.

## 8.3 Defects

- **M19 — `WHATSAPP_CLICK` is counted twice per order** (server + client), so the dashboard's headline "Order click rate" (`app/dashboard/analytics/page.tsx:60-63`) is roughly **2× the true value**.
- **M20 — the "unique visitors" metric is meaningless.** The server records `STORE_VIEW` with a freshly generated `newSessionId()` on *every* render (`app/[slug]/page.tsx:64` → `lib/analytics.ts:12-14`), so every store view is a unique session. `uniqueSessions` therefore approximates `storeViews`, and the *"N unique visitors"* sub-label on the analytics tile is wrong.
- **M21 — a database write inside the render path.** The `STORE_VIEW` insert happens during server rendering; `recordEvent` swallows all failures (`lib/analytics.ts:31-33`), so a database error is invisible. The render is therefore not idempotent.
- **M23 — unbounded in-memory aggregation.** `getStoreAnalytics` runs `findMany` over the entire range with no limit and no SQL-side aggregation. The database already holds 3,019 events; this becomes a memory and latency problem as usage grows.
- **H11 — the metrics are poisonable.** `POST /api/analytics` is unauthenticated and accepts an arbitrary `businessId`. Anyone can inflate any store's views and clicks. The code comment at `app/api/analytics/route.ts:27` claims *"Rate guard: at most ~30 events per session per request burst"* — **no such guard exists in the code.**
- **L37 — daily buckets use UTC** (`toISOString()`, `lib/analytics.ts:99`) while businesses operate in `Africa/Lagos`; daily bars can be off by up to 7 hours from the seller's local day.

---

# 9. TESTING AND DEPLOYMENT

## 9.1 Tests

`vitest.config.ts` — node environment, includes `lib/**/__tests__/**/*.test.ts` and `tests/**/*.test.ts`.

| Suite | Tests | Result |
|---|---|---|
| `lib/cart/__tests__/cart.test.ts` | 11 | ✓ pass |
| `lib/money/__tests__/money.test.ts` | 9 | ✓ pass |
| `lib/whatsapp/__tests__/whatsapp.test.ts` | 13 | ✓ pass |
| `lib/plans/__tests__/plans.test.ts` | 14 | ✓ pass |
| `lib/__tests__/platform.test.ts` | 10 | ✓ pass |
| **Total** | **57** | **✓ 5/5 files pass** |

`npx tsc --noEmit` → **clean**. `npx next lint` → **"No ESLint warnings or errors"**.

**Coverage gaps:** no tests for `lib/orders.ts` (`createOrder` snapshotting), `lib/server-auth.ts`, any API route, any React component, or the `lib/validation.ts` schemas. `lib/__tests__/platform.test.ts:16` calls `getActivePlan()` against the **real database**, so `npm test` fails without a live `DATABASE_URL` — it is not CI-safe, and there is no mocking layer.

## 9.2 Environment variables

Required in production: `DATABASE_URL`, `AUTH_SECRET`, `APP_URL`, `NEXTAUTH_URL`.
Optional: `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, `OPENAI_API_KEY`, `STORAGE_PROVIDER` (+ S3 variables), `SMTP_*`.

**`.env.example` is wrong and will break a fresh setup.** It states *"development uses SQLite; switch provider to postgresql"* and ships `DATABASE_URL="file:./dev.db"` (`.env.example:9-11`), while `prisma/schema.prisma:16-19` is `provider = "postgresql"`. Following the example produces a Prisma provider-mismatch error. See **M25**.

`.env` is correctly gitignored and **untracked** — verified with `git ls-files`: only `.env.example` is tracked. **No secrets are committed.** ✓

The current `.env` was inspected for **shape only** (variable names, scheme, port, length) — no value is reproduced here. It contains: `APP_URL` and `NEXTAUTH_URL` set to an `https://` origin of length 31; `AUTH_SECRET` set (length 41); `DATABASE_URL` set to a `postgresql://` URL of length 132; **`PAYSTACK_SECRET_KEY` empty**; `PAYSTACK_PUBLIC_KEY` empty; `OPENAI_API_KEY` empty; `STORAGE_PROVIDER=local`; all `S3_*` and `SMTP_*` empty.

The `DATABASE_URL` uses a **Supabase pooler host** (confirmed by both the host form and the `postgres.<project-ref>` username form) on **port 5432** — which is the **session pooler**, exactly what `wrangler.toml:19-21` requires — with **`sslmode=no-verify`**. So the host and pooler mode are correct; the outstanding problem is the TLS trust chain (**C7**) and the disabled verification (**H17**), not the host.

> **Correction to an earlier reading of this audit.** An earlier draft of this report stated that `.env` pointed at the **direct** IPv6-only host and that the session pooler runs on **6543**. Both claims were wrong. The direct host appears only in the stale runbooks (`DEPLOYMENT_GUIDE.txt:14-21`, `DATABASE_STATUS.txt:53, 78-81`), and **6543 is the *transaction* pooler port, not the session pooler** — `wrangler.toml:19-21` asks for the *session* pooler, which is port 5432 on the same pooler host. Switching to 6543 would be a **regression**: PgBouncer in transaction mode does not support the session-level prepared statements Prisma's `pg` driver adapter relies on. C7 has been rewritten accordingly.

Two additional Workers-local variable files exist and are **not** covered by `.gitignore` (see **H18**):

| File | Shape | Ignore status |
|---|---|---|
| `.dev.vars` | `APP_URL` / `NEXTAUTH_URL` (https, len 31), `AUTH_SECRET` (len 41, **identical to `.env`**), `DATABASE_URL` (pooler host, port 5432, `sslmode=no-verify`, len 132) | **ignored** (`.gitignore:33`) ✓ |
| `.dev.vars.bak` | the same, with a `DATABASE_URL` **byte-identical to `.env`** (len 132) | **not ignored** — was present in the repository root during this audit, since removed |

`certs/prod-ca-2021.crt` (1,367 bytes) was also added during the audit window: the **Supabase Root 2021 CA** certificate (self-signed, `sha256RSA`, valid 2021-04-28 → 2031-04-26). It is a **public** certificate, not a secret, and is the asset required to complete the Hyperdrive remedy in **C7** / **H17**. It should be committed deliberately.

## 9.3 Deployment configuration

- `wrangler.toml` — `APP_URL` / `NEXTAUTH_URL` = `https://pricelist.pricelistng.workers.dev`. `DATABASE_URL` and `AUTH_SECRET` are intentionally **not** in `[vars]`; the comments correctly instruct operators to use `wrangler secret put`. ✓ Good pattern.
- `wrangler.toml:23-42` (uncommitted) — documents the **Hyperdrive** remedy for the Workers TLS trust problem: upload `certs/prod-ca-2021.crt` as a certificate authority, create a Hyperdrive instance with `--sslmode verify-full`, and bind it. The `[[hyperdrive]]` block (`:39-42`) is **still commented out**, so nothing is bound at runtime. See **C7**.
- `open-next.config.ts` → `buildCommand: "npm run build:next"`, R2 incremental cache. ✓
- `next.config.js` — `output: "standalone"`, `images.unoptimized: true`, `outputFileTracingIncludes` for the Prisma WASM compiler, Node polyfill shims for the Workers runtime, and three security response headers.
- `scripts/patch-prisma-client.mjs` — a `postinstall` hook; `build.log` confirms it ran successfully.
- `DATABASE_STATUS.txt` and `DEPLOYMENT_GUIDE.txt` are **stale, untracked-by-intent but committed** runbooks that describe a Cloudflare **Pages** deployment (the app is configured for **Workers**) and that recommend *"temporarily use SQLite"* for production. See **L36**.

## 9.4 Error handling

Consistent and good. Every API handler wraps its work in `try/catch`, maps `UnauthorizedError` / `ForbiddenError` / `NotFoundError` to 401 / 403 / 404, logs with a `[route:VERB]` tag, and returns a generic user-facing message with no internal detail leakage. `lib/analytics.ts:31-33` deliberately swallows analytics failures so tracking can never break a storefront. ✓

## 9.5 Likely production risks

1. **No migrations** — schema drift is invisible and a fresh deploy cannot be reproduced (**H13**).
2. **A destructive `supabase-init.sql` in the repository root** that drops all ten tables (**C6**).
3. **The deployed Worker cannot open a verifiable TLS connection to Supabase** — the Hyperdrive remedy is documented but the binding is not enabled (**C7**, **H17**).
4. **One TCP connection per request** to the Supabase session pooler, `max: 1` (**M22**).
5. **TLS certificate verification disabled** (`rejectUnauthorized: false` forced for every connection string) (**H17**).
6. **Domain mismatch** — the site, the landing-page FAQ and the onboarding screen all promise `pricelist.ng/<store>`, but the deployed `APP_URL` is `pricelist.pricelistng.workers.dev`; and `app/onboarding/page.tsx:653` reads `process.env.NEXT_PUBLIC_APP_URL`, **a variable that is never defined**, so the onboarding completion screen literally displays `localhost:3000/your-store` (**M18**).
7. **Stray runtime dependencies** — `build@0.1.4`, `run@2.1.8`, `npm@12.2.0` are in `dependencies` (`package.json:24-26`), almost certainly `npm install build` / `npm install run` typos. They have no install scripts (verified), so there is no active exploit, but they are needless supply-chain surface and bundle weight (**L32**).
8. **Version drift** — `eslint-config-next@14.2.30` against `next@15.5.28`; `next lint` is deprecated for Next 16 (**L33**).
9. **No CI pipeline** (no `.github/workflows`) (**L35**).
10. **Secret-file ignore rules are exact-name only** — a `.dev.vars.bak` carrying the live `AUTH_SECRET` and `DATABASE_URL` sat untracked and un-ignored in the repository root during this audit (**H18**).
11. `prisma/dev.db` — a 1.6 MB leftover SQLite file alongside a Postgres-only schema (**L41**).

---

# 10. FINDINGS

**Severity:** **Critical** = launch blocker, or direct exposure of credentials / revenue / data loss · **High** = exploitable, or breaks a promise made to the customer · **Medium** = correctness or robustness with real user impact · **Low** = hygiene and maintainability.

**Status:** *Confirmed* = established by code inspection, by executed checks, or by a read-only database query. *Needs testing* = the defect is present in code but its runtime behaviour or impact has not been observed.

| # | Finding | Evidence — file : function / component | Severity | Recommended fix | Status |
|---|---|---|---|---|---|
| **C1** | **Password-reset email is never sent.** `sendEmail` returns `true` when `SMTP_HOST` is set **without sending anything**, and `false` otherwise. In production the user is told a link is on its way, no email arrives, and the reset link is not returned either — the flow is unrecoverable. | `lib/email.ts:11-18` `sendEmail`; `app/api/auth/forgot-password/route.ts:19-28` | **Critical** | Implement a real transactional provider (Resend / SES / Postmark / SendGrid) behind `sendEmail`; return `false` on failure and surface the failure to the user; add a test that asserts a message is dispatched. | **Confirmed** (code) |
| **C2** | **Any authenticated user can grant themselves a paid plan for free** when `PAYSTACK_SECRET_KEY` is unset. The current `.env` has it **empty**. The only guard is *"is the key present"*, plus a client-side `window.confirm`. | `app/api/billing/checkout/route.ts:109-121`; `lib/paystack.ts:157-182` `activatePlanDevMode` | **Critical** | Fail closed: in production, return `503` when the key is missing. Gate dev-mode behind an explicit `ALLOW_DEV_BILLING=true`. Add a boot-time assertion. | **Confirmed** |
| **C3** | **"Subscription" is a one-time charge.** `transaction/initialize` is used rather than a Paystack Plan / Subscription; `renewalDate` is set locally and **never read** by `getActivePlan`. One ₦1,500 payment grants Starter forever, and nothing ever downgrades the account. | `lib/paystack.ts:52-72` `initializeSubscriptionCheckout`; `lib/paystack.ts:129-131, 141`; `lib/plans.ts:23-28` `getActivePlan` | **Critical** | Create Paystack Plans and use the plan-code / subscription flow. Alternatively, implement a renewal job that downgrades on `renewalDate`, and make `getActivePlan` honour `renewalDate`. | **Confirmed** (code) |
| **C4** | **The post-payment return path never activates the plan.** `callback_url` sends the user to `?paystack=success`, but the billing page ignores it and never calls `PUT /api/billing/checkout` with the `reference`. The `PUT` verify branch is unreachable from the browser, so a plan is only ever granted via the webhook — which must be manually registered in the Paystack dashboard. | `lib/paystack.ts:69`; `app/dashboard/billing/page.tsx:84-127` `upgrade`; `app/api/billing/checkout/route.ts:87-107` | **Critical** | Read `paystack=success` and the `reference` on the billing page and call `PUT` with it; keep the webhook as the authoritative path; verify `data.amount === PLANS[plan].priceKobo` before granting. | **Confirmed** |
| **C5** | **The live database contains seeded accounts with published passwords**, including a platform administrator (`admin@pricelist.ng` / `admin1234`, `demo@pricelist.ng` / `demo1234`), plus 3,019 fabricated analytics events that will distort every dashboard. | `prisma/seed.ts:28-52`; read-only DB query: 4 users, 1 with `role = ADMIN` | **Critical** | Remove the seeded users from production and rotate the admin password. Make `db:seed` refuse to run against a non-demo `DATABASE_URL`. Delete the fabricated events. | **Confirmed** (DB query) |
| **C6** | **A destructive SQL script sits in the repository root.** `supabase-init.sql` begins with `DROP TABLE IF EXISTS … CASCADE` for all ten tables. An operator running it against the live Supabase project to "initialise" it would **destroy all production data** — users, businesses, products, orders, analytics and subscriptions. | `supabase-init.sql:1-11` (untracked, repo root) | **Critical** | Delete the file, or move it to a `scripts/` folder with a loud "DESTROYS ALL DATA" header and require an explicit `--yes --env production` confirmation. Prefer a real Prisma migration baseline (**H13**). | **Confirmed** (file read) |
| **C7** | **The Worker cannot open a trusted TLS connection to Supabase, and the documented remedy is only half applied.** The Workers runtime trusts only publicly signed certificates, while Supabase serves a chain issued by its own "Supabase Root 2021 CA" — so a direct TLS handshake from `workerd` is rejected by the runtime. `wrangler.toml:23-42` now documents the correct remedy (upload `certs/prod-ca-2021.crt` to Cloudflare, create a Hyperdrive instance with `--sslmode verify-full`, bind it), and `lib/db.ts:78-84` already prefers `HYPERDRIVE.connectionString` over `DATABASE_URL`. **But the `[[hyperdrive]]` binding is still commented out (`wrangler.toml:39-42`), the CA has not been uploaded, and no Hyperdrive instance exists**, so the binding is absent at runtime, `resolveConnectionString` falls back to `DATABASE_URL`, and the connection is made with `rejectUnauthorized: false` (**H17**). The deployed Worker therefore either cannot reach the database at all (`P1001`) or reaches it with verification disabled. | `wrangler.toml:23-42`; `lib/db.ts:78-84`; `lib/db.ts:51-64`; `certs/prod-ca-2021.crt`; `DATABASE_STATUS.txt:4` | **Critical** | Run the four operational commands in `wrangler.toml:30-34` against the live Cloudflare account, uncomment and fill in `[[hyperdrive]]`, and keep the Worker secret pointed at the session pooler for local parity. Add a post-deploy connectivity check to the runbook. | **Confirmed** (config + code); live CA upload / Hyperdrive creation **needs testing** |
| **H8** | **User-enumeration oracle.** `forgot-password` returns `devResetUrl` **only when the account exists**, and a bare `{ ok: true }` otherwise; the client renders that link. | `app/api/auth/forgot-password/route.ts:18-31`; `app/forgot-password/page.tsx:34, 61-73` | **High** | Always return `{ ok: true }` with no `devResetUrl`. Restrict the dev link to `NODE_ENV !== "production"` plus an explicit flag. | **Confirmed** |
| **H9** | **Images are stored as base64 data URLs inside Postgres rows.** A 5 MB upload becomes a ~6.7 MB string in `Product.imageUrl`, inlined into storefront HTML and the RSC payload. `storeImageS3()` throws, so `STORAGE_PROVIDER=s3` **breaks uploads entirely**. The live database has **zero** products with images, so this path is untested. | `lib/storage.ts:55-79` `storeImage`; `lib/storage.ts:82-91` `storeImageS3`; `app/api/upload/route.ts:35-40` | **High** | Implement `storeImageS3` against the R2 bucket already bound in `wrangler.toml` (or an S3-compatible bucket) and persist only the URL. Plan a backfill. | **Confirmed** (code); runtime behaviour **needs testing** |
| **H10** | **No rate limiting anywhere.** Unauthenticated write endpoints: `POST /api/orders` (order spam into merchant dashboards), `POST /api/analytics` (database bloat), `POST /api/auth/register` (row spam + credential stuffing), `POST /api/auth/forgot-password` (abuse). | `app/api/orders/route.ts:15`; `app/api/analytics/route.ts:19`; `app/api/auth/register/route.ts:6`; `app/api/auth/forgot-password/route.ts:7` | **High** | Add rate limiting at the Cloudflare edge (WAF rule), or a Redis/Durable Object limiter keyed by IP and session. Add a CAPTCHA to register and forgot-password. | **Confirmed** |
| **H11** | **Analytics are poisonable, and the code's stated guard does not exist.** `POST /api/analytics` accepts an arbitrary `businessId` with no authentication; the comment claims *"Rate guard: at most ~30 events per session per request burst"* but no guard is implemented. | `app/api/analytics/route.ts:19-38` (comment at `:27`) | **High** | Require a signed storefront token so `businessId` matches the store being viewed; implement the rate guard; prefer server-side-only event recording. | **Confirmed** |
| **H12** | **A cancelled subscription can never be re-purchased.** The checkout guard compares the target plan against the stored `plan` *string*, which cancellation leaves unchanged at `PRO`. Every future purchase attempt returns *"You already have this plan or higher."* | `app/api/billing/checkout/route.ts:37-47`; `app/api/subscription/route.ts:62-65` | **High** | Compare against the *effective* plan (`getActivePlan`) rather than the raw field, and reset `plan` to `FREE` on cancellation. | **Confirmed** |
| **H13** | **No version-controlled migrations.** `prisma/migrations/` does not exist; the schema was applied with `db push`; `migrate deploy` reportedly fails with P1001. The production schema is not reproducible, reviewable, or deployable to a fresh database. | `prisma/` (no `migrations/`); `DATABASE_STATUS.txt:4`; `package.json:15-16` | **High** | Generate and commit a baseline migration; make `migrate deploy` part of the release runbook; test it against a fresh Postgres database. | **Confirmed** |
| **H14** | **The WhatsApp message shows the list price while the subtotal uses the sale price.** Sellers can be quoted the wrong amount. The database order is correct — only the outbound message is wrong. | `components/storefront/cart-drawer.tsx:237-249` (uses `l.priceKobo`); compare `lib/cart.ts:24-34` `effectivePrice` | **High** | Pass `l.effectivePriceKobo` as `priceKobo`. Add a regression test asserting that a sale item's message price equals its subtotal ÷ quantity. | **Confirmed** |
| **H15** | **Accent colour is a Pro feature that is not enforced server-side.** The UI blocks it client-side only; the API accepts it on any plan. | `app/api/businesses/[id]/customize/route.ts:58-60` vs. `:61-88` (which do gate branding and hero) | **High** | Add the same `plan !== "PRO"` guard used for branding and hero, returning `403 ACCENT_PRO_ONLY`. | **Confirmed** |
| **H16** | **Cancelling downgrades immediately, contradicting the UI.** `status` is set to `CANCELLED` and `getActivePlan` then returns `FREE` at once, while the UI promises access *"until the end of the billing period"*. Paystack is never told to cancel. | `app/api/subscription/route.ts:62-65`; `lib/plans.ts:23-28`; copy at `app/dashboard/billing/page.tsx:132, 146` | **High** | Introduce a `CANCELLING` status honoured by `getActivePlan` until `renewalDate`, and call Paystack's cancel API. | **Confirmed** |
| **H17** | **Database TLS certificate verification is disabled.** The connection string specifies `sslmode=no-verify`, and `lib/db.ts` **strips** `sslmode` entirely and forces `ssl: { rejectUnauthorized: false }` — unconditionally, for whatever connection string it is handed, including a Hyperdrive one. Verification is off regardless of how the URL is written. | `.env` (`sslmode=no-verify`); `lib/db.ts:51-64` `buildPoolConfig`; `lib/db.ts:59` | **High** | The remediation is now concrete: `certs/prod-ca-2021.crt` is the **Supabase Root 2021 CA** (self-signed, sha256RSA, valid 2021-04-28 → 2031-04-26). Upload it with `wrangler cert upload certificate-authority --ca-cert certs/prod-ca-2021.crt --name supabase-ca`, create the Hyperdrive instance with `--sslmode verify-full`, then set `rejectUnauthorized: true` for any non-Hyperdrive connection and keep the exemption only where the platform terminates TLS. | **Confirmed** (code); the end-to-end verified handshake **needs testing** |
| **H18** | **Secret-file ignore rules are exact-name only, and a live secret backup was exposed to `git add .`.** `.gitignore` lists `.env` (line 8), `.dev.vars` (line 33) and `*.backup` (line 26) — but **not** `*.bak`, `.env.*` or `.dev.vars.*`. During this audit a **`.dev.vars.bak`** file (291 bytes) was present in the repository root and appeared in `git status` as untracked and **not ignored**; its `AUTH_SECRET` was **byte-identical to the live `.env` `AUTH_SECRET`**, and its `DATABASE_URL` was **byte-identical to the live `.env` `DATABASE_URL`** (production database credentials). It was removed later in the audit window and was never committed (`git log --all` — no history), so nothing has leaked yet — but the ignore gap that allowed it remains. | `.gitignore:8, 26, 33`; working-tree observation during the audit | **High** | Replace the exact-name entries with patterns: `.env*`, `.dev.vars*`, `*.bak`, `*.pem`, `*.key`. Leave `certs/` un-ignored — the CA certificate is public and should be committed deliberately. Then re-scan the history for any secret file that was ever committed. | **Confirmed** (working-tree observation; file now removed) |
| **M18** | **Domain and URL mismatch, plus a broken onboarding screen.** The site advertises `pricelist.ng/<store>`; the deployed `APP_URL` is `pricelist.pricelistng.workers.dev`. Onboarding reads `process.env.NEXT_PUBLIC_APP_URL`, **a variable that is never defined**, so the completion screen shows `localhost:3000/your-store`. | `app/page.tsx:126, 275`; `app/onboarding/page.tsx:653`; `wrangler.toml:9` | **Medium** | Point `APP_URL` at the real production domain, replace `NEXT_PUBLIC_APP_URL` with `APP_URL` (or inject it server-side), and add a build-time assertion on the expected host. | **Confirmed** |
| **M19** | **`WHATSAPP_CLICK` is recorded twice per order** (server in `createOrder` + client on the checkout button), inflating the dashboard's conversion rate to roughly 2×. | `lib/orders.ts:81-84`; `components/storefront/cart-drawer.tsx:253` | **Medium** | Record the event in exactly one place — server-side is authoritative. | **Confirmed** |
| **M20** | **The "unique visitors" metric is meaningless.** Every server-side `STORE_VIEW` uses a brand-new `newSessionId()`. | `app/[slug]/page.tsx:63-66`; `lib/analytics.ts:12-14`; consumed at `lib/analytics.ts:73, 113` | **Medium** | Reuse the client `pl_session` id (or a cookie) for `STORE_VIEW`, or drop the metric. | **Confirmed** |
| **M21** | **The storefront performs two full `getStorefront` queries per request** (once in `generateMetadata`, once in the body) and **writes an analytics row during render**. No explicit `dynamic` / `revalidate` is declared. | `app/[slug]/page.tsx:12-42` and `:44-69`; `lib/storefront.ts:59-70` | **Medium** | Fetch once and share the result (React `cache()`), declare `export const dynamic = "force-dynamic"` explicitly, and move the event write out of the render into an after-response hook. | **Confirmed** |
| **M22** | **A new `pg` pool and TCP connection are created per request** (`max: 1`), against a Supabase session pooler. Connection churn, and all queries within a request are serialised. | `lib/db.ts:86-108` `createClient`; `lib/db.ts:169-193` `getPrismaClient` | **Medium** | Confirm the pooler is in session mode (it is — port 5432); raise `max`; load-test. | **Confirmed** (code); impact **needs load testing** |
| **M23** | **Analytics aggregation loads every event row in the range into memory** and aggregates in JavaScript, with no limit and no SQL-side aggregation. | `lib/analytics.ts:60-64`; `lib/analytics.ts:82-95` | **Medium** | Aggregate in SQL (`groupBy` / `count`) or precompute daily rollups. | **Confirmed** |
| **M24** | **No `Content-Security-Policy`, `Strict-Transport-Security` or `Permissions-Policy` headers.** Only `X-Content-Type-Options`, `X-Frame-Options` and `Referrer-Policy` are set. | `next.config.js:26-37` | **Medium** | Add a CSP (the app loads Google Fonts and applies inline styles, so a nonce or `style-src 'unsafe-inline'` will be needed), HSTS, and a restrictive Permissions-Policy. | **Confirmed** |
| **M25** | **`.env.example` still instructs SQLite** (`DATABASE_URL="file:./dev.db"`) while the schema is `postgresql` — a guaranteed copy-paste failure for any new setup. | `.env.example:9-11`; `prisma/schema.prisma:16-19` | **Medium** | Update `.env.example` to the Postgres **pooler** form and delete the SQLite paragraph. | **Confirmed** |
| **M26** | **No enum or CHECK constraints** on `role`, `plan`, `status`, `eventType`, `type` or `category`; `Subscription.plan` is never validated on write, and `PLANS[plan].maxProducts` has no optional chaining — one corrupt row 500s product creation. Two of the three live businesses also use Pro-only themes on FREE plans (seeded directly, bypassing the API). | `prisma/schema.prisma:27, 45, 111, 133, 162-163, 177`; `lib/plan-data.ts:107`; `lib/paystack.ts:136`; `prisma/seed.ts:209, 295` | **Medium** | Convert to native Postgres enums or add CHECK constraints; validate `plan` against `PLAN_ORDER` before upsert; use `PLANS[plan]?.maxProducts`. | **Confirmed** |
| **M27** | **Reserved slugs are not validated at store-creation time.** A business named "Admin" is assigned slug `admin`, and `app/[slug]/page.tsx` then redirects that storefront to `/admin`, making the store permanently unreachable. The reserved list is a hand-maintained literal that will drift from the route tree. | `app/[slug]/page.tsx:47-53`; `app/api/businesses/route.ts:68-71` | **Medium** | Validate the slug against a server-side reserved list derived from the route manifest at creation, and return `409` with a suggested alternative. | **Confirmed** |
| **M28** | **No session invalidation on password change, and no account deletion.** JWT sessions live 30 days and survive a reset; the settings page offers only business-profile editing. There is also no explicit CSRF protection (mitigated only incidentally by JSON bodies and `SameSite=Lax`). | `lib/auth.ts:37`; `app/api/auth/reset-password/route.ts:28-31`; `app/dashboard/settings/page.tsx` | **Medium** | Bump a `token.version` on password change and validate it in the `jwt` callback; add "Change password" and "Delete account"; add explicit CSRF tokens or document the mitigation. | **Confirmed** |
| **M29** | **`POST /api/orders` does not check `business.suspended`.** A suspended store's storefront 404s, but its API still accepts and persists orders. | `app/api/orders/route.ts:29-47`; `lib/orders.ts:31-41`; contrast `lib/storefront.ts:71-73` | **Medium** | Add a `suspended` check when resolving the business inside `createOrder`. | **Confirmed** |
| **M30** | **`/api/upload` trusts the client-declared `Content-Type`** and never inspects the file's bytes, so arbitrary content can be stored under an image MIME type. | `app/api/upload/route.ts:26-39`; `lib/storage.ts:33-42` `validateUpload` | **Medium** | Inspect the first bytes of the decoded buffer and reject anything not matching the PNG / JPEG / WEBP / GIF signatures. | **Confirmed** |
| **L31** | `Order.discount` holds *savings*, while `Order.subtotal` is already net and `Order.total === Order.subtotal`. The column name misleads future reporting. | `lib/orders.ts:62-64`; rendered at `app/dashboard/orders/page.tsx:221-236` | Low | Rename to `savingsKobo` or store a true pre-discount subtotal; add a `total = subtotal` check constraint. | **Confirmed** |
| **L32** | Stray runtime dependencies `build@0.1.4`, `run@2.1.8`, `npm@12.2.0` (install typos). No install scripts, so no active exploit, but needless supply-chain surface and bundle weight. | `package.json:24-26`; verified in `node_modules` | Low | Remove all three from `dependencies` and re-run `npm install`. | **Confirmed** |
| **L33** | `eslint-config-next@14.2.30` against `next@15.5.28`; `next lint` is deprecated for Next 16. | `package.json:31, 57` | Low | Upgrade to `eslint-config-next@15` and migrate to the ESLint CLI. | **Confirmed** |
| **L34** | `next-auth@4.24.11` is legacy (v5 / Auth.js is the current line). The v4 Credentials flow has no built-in rate limiting, lockout, or account-lockout. | `package.json:31`; `lib/auth.ts:36-81` | Low | Plan a v5 migration; add lockout and backoff in the meantime. | **Confirmed** |
| **L35** | **No CI pipeline**, and the test suite requires a live `DATABASE_URL` (`platform.test.ts:16` hits the real database), so `npm test` cannot run in CI as written. | `.github/` absent; `lib/__tests__/platform.test.ts:12-23` | Low | Add a GitHub Actions workflow running `typecheck`, `lint`, `test`; mock Prisma in the unit tests. | **Confirmed** |
| **L36** | The repository's runbooks recommend SQLite for production (*"temporarily use SQLite… NOT for real usage!"*) and describe a Cloudflare **Pages** deployment, while the app is configured for **Workers**. A wrong runbook. | `DEPLOYMENT_GUIDE.txt:48-56, 90-100`; `DATABASE_STATUS.txt:40-58`; vs. `wrangler.toml` | Low | Delete both files; replace with one accurate Workers runbook referencing `wrangler secret put` and `migrate deploy`. | **Confirmed** |
| **L37** | Analytics daily buckets use UTC (`toISOString`) while businesses operate in `Africa/Lagos`; daily bars can be off by up to 7 hours. | `lib/analytics.ts:99`; `lib/storefront-utils.ts:24-41` | Low | Bucket by the business timezone. | **Confirmed** |
| **L38** | Code hygiene: `import { prisma }` sits at the **bottom** of the analytics route; `buildOrderMessage` is imported but unused in the orders page; `uploadSchema` in `lib/validation.ts` is dead code (the route defines its own). | `app/api/analytics/route.ts:73`; `app/dashboard/orders/page.tsx:22`; `lib/validation.ts:136-140` | Low | Move the import to the top; remove the unused symbols; reuse the shared schema. | **Confirmed** |
| **L39** | `DELETE /api/admin` is used for a **read** operation, and `app/api/admin/route.ts:236` is a `void getCurrentUser;` no-op. | `app/api/admin/route.ts:166, 236`; `app/admin/page.tsx:151-158` | Low | Use `GET` with query parameters; delete the no-op import. | **Confirmed** |
| **L40** | No pagination: `GET /api/orders` caps at 100 rows; the product search in `GET /api/products/bulk` caps at 25. | `app/api/orders/route.ts:90`; `app/api/products/bulk/route.ts:88` | Low | Add cursor pagination. | **Confirmed** |
| **L41** | Leftover `prisma/dev.db` — a 1.6 MB SQLite file alongside a Postgres-only schema. | `prisma/dev.db` (gitignored) | Low | Delete it. | **Confirmed** |
| **L42** | No `robots.txt` / `sitemap.xml`. The dashboard and admin pages are prerendered static HTML shells (data is fetched client-side and API-gated, so **no data leaks** — but the shells are public). | `.next/server/app/admin.html`, `.next/server/app/dashboard/*.html`; no sitemap route in `app/` | Low | Add `app/robots.ts` and `app/sitemap.ts`; optionally mark `/dashboard` and `/admin` `noindex`. | **Confirmed** |
| **L43** | **Throwaway TLS-probe artifacts were present in the repository** during the audit: `scripts/probe-worker/index.js` and `wrangler.probe.toml` defined a deployable Cloudflare Worker that reads `env.DATABASE_URL` and opens TLS sockets to arbitrary hosts — a credential-bearing, SSRF-shaped artifact. **Both were removed from the working tree during the audit window**; this row is retained as a record and as a reminder not to reintroduce them. | `scripts/probe-worker/index.js:34-41`; `wrangler.probe.toml` (both now deleted) | Low | Keep them out of the repository; if the probe is needed again, keep it in a scratch directory outside the project. | **Confirmed**; now **resolved** |

### Findings summary

| Severity | Count | IDs |
|---|---|---|
| Critical | 7 | C1–C7 |
| High | 11 | H8–H18 |
| Medium | 13 | M18–M30 |
| Low | 13 | L31–L43 |
| **Total** | **44** | |

---

# 11. THE FIVE HIGHEST-PRIORITY ACTIONS

## 1. Make password recovery actually work, and stop leaking account existence
`lib/email.ts:11-18` never sends an email; `app/api/auth/forgot-password/route.ts:28` returns the reset link only for accounts that exist. Wire a real transactional email provider, always return `{ ok: true }` with no `devResetUrl`, restrict the dev link to non-production, and add rate limiting.

**Why first:** every locked-out user is a lost customer, and the current behaviour is a silent, indefinite failure. *(Fixes C1, H8, and part of H10.)*

## 2. Complete the Paystack subscription end to end
One workstream, four linked defects:
- **(a)** Fail closed when `PAYSTACK_SECRET_KEY` is missing in production — **the current `.env` has it empty**, so any user can claim Pro for free.
- **(b)** Use real Paystack Plans / subscriptions rather than a one-time `transaction/initialize`, and make `getActivePlan` honour `renewalDate`.
- **(c)** Activate the plan on the `?paystack=success` return path by calling `PUT` with the `reference`; keep the webhook authoritative while implementing `subscription.disable` and `charge.failed`.
- **(d)** Verify `amount === PLANS[plan].priceKobo` before granting.

**Why second:** this is the entire revenue model. **Do not launch the pricing page until this passes an end-to-end test with a live ₦1,500 charge and a real renewal.** *(Fixes C2, C3, C4, H12, H16.)*

## 3. Purge demo credentials, demo data, and the destructive SQL script from the live environment
`prisma/seed.ts` created `admin@pricelist.ng / admin1234` and `demo@pricelist.ng / demo1234` in the production database, alongside 3,019 fake analytics events that will distort every dashboard you look at. Separately, `supabase-init.sql` will **drop all ten tables** if anyone runs it against production.

Remove the seeded users, rotate the admin password, delete the fabricated events, make `db:seed` refuse to run against a non-demo `DATABASE_URL`, and delete or hard-gate `supabase-init.sql`.

**Why third:** this is a standing credential and data-loss exposure that exists right now, before a single customer signs up. *(Fixes C5, C6, and the demo half of M26.)*

## 4. Finish the database connectivity story and establish version-controlled migrations
The database connection problem is now **diagnosed but not closed**. The root cause is a TLS trust-chain mismatch: the Workers runtime trusts only publicly signed certificates, and Supabase serves a chain issued by its own "Supabase Root 2021 CA", so a direct handshake from `workerd` is rejected. The remedy is Cloudflare Hyperdrive, which terminates the Supabase certificate on Cloudflare's side:

- `certs/prod-ca-2021.crt` is the CA certificate and is already in the repository.
- `wrangler.toml:30-34` documents the exact `wrangler cert upload` and `wrangler hyperdrive create --sslmode verify-full` commands.
- `lib/db.ts:78-84` already prefers `HYPERDRIVE.connectionString`.
- **The `[[hyperdrive]]` binding (`wrangler.toml:39-42`) is still commented out** — until it is enabled, the Worker falls back to `DATABASE_URL` with `rejectUnauthorized: false`.

Do **not** "fix" this by switching to port 6543. That is the *transaction* pooler; PgBouncer in transaction mode does not support the session-level prepared statements Prisma's `pg` driver adapter uses. The current `.env` already points at the **session pooler** on 5432, which is correct.

Alongside that: generate and commit a baseline Prisma migration — `prisma/migrations/` is empty and `migrate deploy` reportedly fails with P1001 — fix `.env.example` (it still says SQLite), widen the secret-file ignore rules, delete the two stale runbooks (they prescribe the wrong pooler mode and a Cloudflare **Pages** deployment), and correct the domain mismatch so the app, the landing page, and the onboarding completion screen all point at the same real host — `app/onboarding/page.tsx:653` currently shows `localhost:3000/your-store` because `NEXT_PUBLIC_APP_URL` is undefined.

**Why fourth:** without a verifiable connection and a reproducible schema, every deploy is a gamble, and the Worker may not be able to reach the database at all in production. *(Fixes C7, H13, H17, H18, L36, M18, M25.)*

## 5. Add abuse protection to the public write endpoints
`POST /api/orders` and `POST /api/analytics` are unauthenticated and unrated: anyone can spam fake orders into a merchant's dashboard or inflate any store's metrics — and the code's own rate-guard comment describes a control that does not exist. Add edge-level rate limiting, bind analytics events to the storefront being viewed, and count `WHATSAPP_CLICK` in exactly one place so the conversion metric stops reporting roughly 2×.

**Why fifth:** these are the endpoints a customer, a competitor, or a bot reaches first. *(Fixes H10, H11, M19, and part of M29.)*

> **Strongly recommended sixth, if the launch timeline allows:** move image storage off base64-in-Postgres to the R2 bucket already bound in `wrangler.toml` (`lib/storage.ts:76`). Every product image is currently a ~6.7 MB string in a database row, inlined into the storefront HTML — and **the database has zero products with images, so this path has never run with real data**.

---

# APPENDIX A — Verification method

## Commands executed (read-only)

| Command | Result |
|---|---|
| `npx tsc --noEmit` | Clean — no type errors |
| `npx next lint` | "No ESLint warnings or errors" |
| `npx vitest run` | **57 / 57 passed** across 5 files (7.3 s) |
| `git ls-files` | Only `.env.example` is tracked among env-like files — **no secrets committed** |
| `git status --porcelain` | Working tree at hand-off: `M lib/db.ts`, `M wrangler.toml`, plus untracked `certs/` and `supabase-init.sql` (see the note below) |
| Read-only Prisma aggregate queries | Counts and enum distributions only; no sensitive user data read |
| `.next/routes-manifest.json`, `.next/prerender-manifest.json`, `.next/server/app/**` | Route prerendering and dynamic-route status |
| Full-tree grep for `supabase` | 18 matches, all in `DEPLOYMENT_GUIDE.txt`, `DATABASE_STATUS.txt` and `wrangler.toml` comments — **plus the `supabase-init.sql` file itself** |
| Grep for `ROW LEVEL SECURITY` / `CREATE POLICY` / `GRANT` / `REVOKE` in `supabase-init.sql` | **0 matches** — confirms the absence of any database-level policy or grant |
| `git log --all -- .env .dev.vars .dev.vars.bak` | **Empty** — no environment or secret file has ever been committed |
| `git check-ignore -v` on `.dev.vars.bak` and `certs/` | **Not ignored** — the basis of finding H18 |
| `X509Certificate2` inspection of `certs/prod-ca-2021.crt` | Subject `CN=Supabase Root 2021 CA, O=Supabase Inc`, self-signed, `sha256RSA`, valid 2021-04-28 → 2031-04-26 |
| Connection-string **shape** inspection of `.env`, `.dev.vars`, `.dev.vars.bak` | Scheme, port, query-parameter names, host class (pooler vs direct), username form and value length only — **no credential value was read into this report** |
| `git status --porcelain` re-checked at hand-off | `M lib/db.ts`, `M wrangler.toml`, `?? certs/`, `?? supabase-init.sql` — the tree changed during the audit; see the working-tree note |

## Note on the working-tree changes made during the audit window

The repository was being modified **in parallel** with this audit. The audit's baseline is commit `b42e40a`; the findings above describe the state of the working tree **as of hand-off**. The in-flight changes are recorded here so the reader knows what is already addressed and what is not.

| Change | State | Effect on findings |
|---|---|---|
| `lib/db.ts` — pool lifecycle refactor (`ctx.waitUntil` → Next.js `after()`, a `pool.on("error")` guard, deferred cleanups) | Uncommitted, pre-existing | **None.** `buildPoolConfig` still strips `sslmode` and forces `rejectUnauthorized: false` (**H17**), now at `lib/db.ts:51-64` / `:59`. `createClient` is at `:86-108` and `getPrismaClient` at `:169-193` (**M22**). |
| `lib/db.ts` — **Hyperdrive support added**: `RequestScope.env`, `resolveConnectionString` (`:78-84`) preferring `HYPERDRIVE.connectionString` | Uncommitted, in progress | **Partially addresses C7.** The code path is correct — the OpenNext request context does carry `env` — but the binding it depends on does not exist yet, so the fallback path is still what runs. |
| `wrangler.toml:23-42` — documents the **Hyperdrive** remedy: upload `certs/prod-ca-2021.crt`, create a Hyperdrive instance with `--sslmode verify-full`, bind it | Uncommitted, in progress | **Partially addresses C7 / H17.** The `[[hyperdrive]]` block (`:39-42`) is still commented out, so nothing is bound at runtime. |
| `certs/prod-ca-2021.crt` — the **Supabase Root 2021 CA** certificate (public, not a secret) | Untracked | The asset needed to complete the remedy. Should be committed deliberately. |
| `scripts/probe-worker/`, `wrangler.probe.toml` — throwaway TLS-probe Worker | **Deleted** during the audit window | **L43 — resolved.** |
| `.dev.vars.bak` — plaintext copy of the live `AUTH_SECRET` and `DATABASE_URL`, not covered by `.gitignore` | **Deleted** during the audit window | **H18 — the ignore gap remains** even though the file is gone. |

**Line references in this report were re-verified against the working tree at hand-off**, not against commit `b42e40a`. Two claims were corrected as a result of that re-verification, and both corrections are stated explicitly in the body:

1. **C7 was rewritten.** An earlier draft claimed the `.env` used the *direct* IPv6-only host and that the session pooler runs on **6543**. Direct inspection of the connection string's shape showed a **pooler** host with a `postgres.<project-ref>` username on **port 5432** — the **session** pooler, which is what `wrangler.toml:19-21` actually requires. **6543 is the *transaction* pooler port**, and it appears only in the stale runbooks. The finding has been restated as the real problem: the Workers TLS trust chain versus Supabase's private CA, and the Hyperdrive remedy that is documented but not yet enabled.
2. **H17's remediation was replaced** with the concrete asset now present (`certs/prod-ca-2021.crt`) and the two `wrangler` commands that consume it.

## Files inspected in full

`package.json` · `next.config.js` · `middleware.ts` · `tsconfig.json` · `tailwind.config.js` · `postcss.config.js` · `vitest.config.ts` · `wrangler.toml` · `wrangler.probe.toml` · `open-next.config.ts` · `.env.example` · `.gitignore` · `README.md` · `DATABASE_STATUS.txt` · `DEPLOYMENT_GUIDE.txt` · `build.log` · `supabase-init.sql` · `prisma/schema.prisma` · `prisma/seed.ts` · `scripts/patch-prisma-client.mjs` · `scripts/probe-worker/index.js` · `certs/prod-ca-2021.crt` · `.env` · `.dev.vars` · `.dev.vars.bak` (shape only) · all 24 `app/api/**/route.ts` · all 15 `app/**/page.tsx` · `app/layout.tsx` · `app/globals.css` · `lib/*.ts` (all 26 modules) · `lib/*.js` shims · `components/storefront/*` · `components/ui/*` · `components/dashboard-layout.tsx` · `components/auth-shell.tsx` · `components/brand.tsx` · all 5 test suites.

## APPENDIX B — What was verified, and what was not

**Verified by execution**
- `tsc --noEmit` clean, `next lint` clean, 57/57 tests pass.
- Read-only aggregate queries against the live database (counts and enum distributions only).
- Next build-output manifests, establishing which routes are prerendered and which render on demand.

**Verified by code inspection** (not runtime execution)
- All authorization, ownership scoping, plan enforcement, order construction, payment flow, and analytics behaviour described in this report.
- The absence of RLS, grants and policies — confirmed against `supabase-init.sql` and the full-tree grep.

**Not tested — no claim is made about any of these**
- Real Paystack transactions, live checkout, live webhooks, or whether the webhook is registered in the Paystack dashboard.
- The deployed Worker at `pricelist.pricelistng.workers.dev`, and whether it can reach the database in production.
- The `wrangler cert upload` / `wrangler hyperdrive create` commands in `wrangler.toml:30-34` — they have not been executed, and the resulting Hyperdrive binding has not been enabled, so the verified TLS path is **not** in place (**C7**).
- The S3 / R2 storage path (`storeImageS3` currently throws) and runtime behaviour of `images.unoptimized` with base64 payloads in a production browser.
- Cross-tenant access attempts — excluded by instruction. The isolation conclusions in §4.2 are code-reading conclusions, not penetration results.
- Load, concurrency and multi-tenant contention behaviour; the findings marked "needs testing" in §10.

**The open question the TLS probe was chasing now has an answer.** The cause is not "TLS broken in `workerd` generally" and not a wrong host — it is that **the Workers runtime trusts only publicly signed certificates, while Supabase serves a chain issued by its own "Supabase Root 2021 CA"**. The application responded by turning verification off (`rejectUnauthorized: false`), which is why the probe (which uses `secureTransport: "on"` and *does* verify) behaved differently. The correct resolution is the one now written into `wrangler.toml:23-42`: upload `certs/prod-ca-2021.crt` to Cloudflare, put the database behind a **Hyperdrive** instance created with `--sslmode verify-full`, and bind it — Cloudflare terminates the Supabase certificate on its side and hands the Worker a connection the runtime can verify. Note the earlier draft of this report got this wrong in a way that would have caused harm: it advised switching to port 6543, which is the **transaction** pooler and would break Prisma's prepared statements. The configured **session pooler on 5432 is correct and should be kept.**

---

*End of report. This document is a new, untracked file in the repository root and has not been committed. This audit made no change to any application source file, database, Supabase setting, or Cloudflare resource. Where the working tree changed during the audit window, the change was made by other work and is recorded in the working-tree note in Appendix A.*
