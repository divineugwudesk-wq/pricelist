// Paystack integration (Nigerian payments).
//
// All Paystack calls happen server-side. Secret keys never reach the client.
//
// Billing model
// -------------
// One successful payment buys one period of access (30 days). There is no
// automatic renewal: `renewalDate` is the end of the paid period, and access
// stops then unless the customer pays again. The user interface says exactly
// that — it does not describe a one-time charge as a recurring subscription.
//
// Two rules are enforced here rather than in the routes, so that no caller can
// skip them:
//
//   * a plan is only ever granted after the payment has been verified against
//     Paystack's own API (status, amount, currency, reference and account);
//   * development-mode activation requires an explicit opt-in and is refused
//     in production.

import { prisma } from "@/lib/db";
import { PLANS, type PlanDefinition } from "@/lib/plans";
import { nextPeriodEnd, SUBSCRIPTION_PERIOD_DAYS } from "@/lib/subscription";
import type { Plan, SubscriptionStatus } from "@/lib/db-types";

const PAYSTACK_API = "https://api.paystack.co";

/** The plans that can be bought. */
const PAID_PLANS: Plan[] = ["STARTER", "PRO"];

export function isPaystackConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

/**
 * Whether local plan activation without a payment is allowed.
 *
 * It is off unless the operator asks for it explicitly, and it is always off
 * in production, so a missing Paystack key can never hand out paid plans.
 */
export function isDevBillingAllowed(): boolean {
  return (
    process.env.ALLOW_DEV_BILLING === "true" &&
    process.env.NODE_ENV !== "production"
  );
}

export function paystackPublicKey(): string | null {
  return process.env.PAYSTACK_PUBLIC_KEY ?? null;
}

export function isPaidPlan(plan: string): plan is Plan {
  return PAID_PLANS.includes(plan as Plan);
}

interface PaystackInitializeResponse {
  status: boolean;
  data: { authorization_url: string; reference: string };
}

async function randomBytesToHex(n: number): Promise<string> {
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacSha512Hex(secretKey: string, data: string): Promise<string> {
  const keyBuf = new TextEncoder().encode(secretKey);
  const dataBuf = new TextEncoder().encode(data);
  const cryptoKey = await crypto.subtle.importKey("raw", keyBuf, { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, dataBuf);
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Initialize a checkout for one period of a paid plan. Returns the Paystack
 * authorization URL the customer is redirected to.
 */
export async function initializeSubscriptionCheckout(
  email: string,
  plan: Plan,
  metadata: Record<string, unknown>,
): Promise<{ authorizationUrl: string; reference: string }> {
  const planDef = PLANS[plan];
  const res = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: planDef.priceKobo, // Paystack expects kobo
      currency: "NGN",
      reference: `pl_${await randomBytesToHex(12)}`,
      callback_url: `${process.env.APP_URL}/dashboard/billing?paystack=success`,
      metadata: { ...metadata, plan },
    }),
  });
  if (!res.ok) throw new Error("Paystack initialization failed");
  const data = (await res.json()) as PaystackInitializeResponse;
  if (!data.status || !data.data?.authorization_url) {
    throw new Error("Paystack initialization failed");
  }
  return {
    authorizationUrl: data.data.authorization_url,
    reference: data.data.reference,
  };
}

/** The shape of a verified Paystack transaction that this app cares about. */
export interface VerifiedTransaction {
  reference: string;
  status: string;
  amount: number;
  currency: string;
  paidAt?: string;
  metadata?: { userId?: string; plan?: string };
  subscription?: { subscription_code?: string };
}

/** Verify a Paystack transaction server-side. */
export async function verifyPaystackTransaction(
  reference: string,
): Promise<{ status?: boolean; data?: VerifiedTransaction } | null> {
  if (!reference || !/^[\w-]{1,64}$/.test(reference)) return null;
  const res = await fetch(`${PAYSTACK_API}/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export type PaymentCheckFailure =
  | "not-configured"
  | "no-transaction"
  | "not-successful"
  | "wrong-account"
  | "wrong-plan"
  | "wrong-amount"
  | "wrong-currency";

export type PaymentCheck =
  | { ok: true; plan: Plan; reference: string; subscriptionCode?: string }
  | { ok: false; reason: PaymentCheckFailure };

/**
 * Check a verified transaction against what the server expects.
 *
 * Every field that identifies the purchase is checked on the server: the
 * amount, the currency, the account it was paid for, and the plan it was
 * meant to buy. A client cannot influence any of them.
 */
export function checkPayment(
  verification: { status?: boolean; data?: VerifiedTransaction } | null,
  expected: { userId: string; plan?: Plan },
): PaymentCheck {
  if (!isPaystackConfigured()) return { ok: false, reason: "not-configured" };

  const data = verification?.data;
  if (!verification?.status || !data) return { ok: false, reason: "no-transaction" };
  if (data.status !== "success") return { ok: false, reason: "not-successful" };

  // The payment must belong to the account making the request.
  if (data.metadata?.userId !== expected.userId) {
    return { ok: false, reason: "wrong-account" };
  }

  // The plan comes from the transaction metadata, which only Paystack can
  // set. It must be a real paid plan, and it must be the plan the caller
  // expects when the caller knows which plan was bought.
  const plan = data.metadata?.plan;
  if (!plan || !isPaidPlan(plan)) return { ok: false, reason: "wrong-plan" };
  if (expected.plan && plan !== expected.plan) {
    return { ok: false, reason: "wrong-plan" };
  }

  // The amount must match the plan price exactly.
  if (data.amount !== PLANS[plan].priceKobo) {
    return { ok: false, reason: "wrong-amount" };
  }

  if (data.currency !== "NGN") return { ok: false, reason: "wrong-currency" };

  return {
    ok: true,
    plan,
    reference: data.reference,
    subscriptionCode: data.subscription?.subscription_code,
  };
}

/**
 * Verify Paystack webhook signatures (HMAC-SHA512).
 * Constant-time comparison to prevent timing attacks.
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader || !signatureHeader.startsWith("sha512=")) return false;
  const expected = await hmacSha512Hex(secret, rawBody);
  const provided = signatureHeader.slice("sha512=".length);
  return timingSafeEqual(expected, provided);
}

/**
 * Apply a verified payment: grant one period of the plan.
 *
 * Idempotent per provider reference — a replayed webhook or a repeated
 * return from Paystack does not grant a second period. Renewing before the
 * current period ends extends from the current end date, so paying early
 * never shortens the subscription.
 */
export async function applySuccessfulPayment(
  userId: string,
  plan: Plan,
  reference: string,
  providerSubscriptionId?: string,
): Promise<void> {
  const now = new Date();
  const existing = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: true, status: true, startDate: true, renewalDate: true, providerSubscriptionId: true },
  });

  // Already applied — a repeated delivery of the same payment.
  if (existing?.providerSubscriptionId === reference) return;

  const renewalDate = nextPeriodEnd(existing?.renewalDate ?? null, now);
  const startDate = existing?.startDate ?? now;

  await prisma.subscription.upsert({
    where: { userId },
    update: {
      plan,
      status: "ACTIVE",
      provider: "paystack",
      providerSubscriptionId: reference,
      startDate,
      renewalDate,
    },
    create: {
      userId,
      plan,
      status: "ACTIVE",
      provider: "paystack",
      providerCustomerId: reference,
      providerSubscriptionId: reference,
      startDate,
      renewalDate,
    },
  });
}

/**
 * Development-mode plan activation.
 *
 * Refused unless the operator has explicitly enabled it, and always refused
 * in production. A missing Paystack key must never hand out a paid plan.
 */
export async function activatePlanDevMode(userId: string, plan: Plan): Promise<void> {
  if (isPaystackConfigured()) {
    throw new Error("Development mode is disabled when Paystack is configured.");
  }
  if (!isDevBillingAllowed()) {
    throw new Error(
      "Development billing is not enabled. Set ALLOW_DEV_BILLING=true outside production, or configure Paystack.",
    );
  }
  const now = new Date();
  const existing = await prisma.subscription.findUnique({
    where: { userId },
    select: { startDate: true, renewalDate: true },
  });
  const renewalDate = nextPeriodEnd(existing?.renewalDate ?? null, now);
  await prisma.subscription.upsert({
    where: { userId },
    update: {
      plan,
      status: "ACTIVE",
      provider: "dev",
      startDate: existing?.startDate ?? now,
      renewalDate,
    },
    create: {
      userId,
      plan,
      status: "ACTIVE",
      provider: "dev",
      startDate: now,
      renewalDate,
    },
  });
}

/** Set a subscription's status (e.g. cancel at period end). */
export async function updateSubscriptionStatus(
  userId: string,
  status: SubscriptionStatus,
): Promise<void> {
  await prisma.subscription.update({ where: { userId }, data: { status } });
}

/** Free-plan plan definitions for the billing page. */
export function planDefinition(plan: Plan): PlanDefinition {
  return PLANS[plan];
}

/** How many days one payment covers. Surfaced to the billing page. */
export const PERIOD_DAYS = SUBSCRIPTION_PERIOD_DAYS;
