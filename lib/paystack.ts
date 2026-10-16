// Paystack integration (Nigerian payments).
// All Paystack calls happen server-side. Secret keys never reach the client.
// When PAYSTACK_SECRET_KEY is unset the platform runs in development mode:
// billing UI clearly labels it and plan changes are applied directly.

import { prisma } from "@/lib/db";
import { PLANS, type PlanDefinition } from "@/lib/plans";
import type { Plan, SubscriptionStatus } from "@/lib/db-types";

const PAYSTACK_API = "https://api.paystack.co";

export function isPaystackConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

export function paystackPublicKey(): string | null {
  return process.env.PAYSTACK_PUBLIC_KEY ?? null;
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
 * Initialize a subscription checkout. Returns the Paystack authorization
 * URL the customer is redirected to.
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

/** Verify a Paystack transaction server-side. */
export async function verifyPaystackTransaction(reference: string) {
  const res = await fetch(`${PAYSTACK_API}/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  });
  if (!res.ok) return null;
  return res.json();
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

export interface WebhookEvent {
  event: string;
  data: {
    reference: string;
    amount: number;
    metadata?: { userId?: string; plan?: Plan };
    customer?: { email?: string };
    subscription?: { subscription_code?: string };
  };
}

/**
 * Apply a successful payment: create/upgrade the user's subscription.
 * Idempotent per provider reference.
 */
export async function applySuccessfulPayment(
  userId: string,
  plan: Plan,
  reference: string,
  providerSubscriptionId?: string,
): Promise<void> {
  const now = new Date();
  const renewal = new Date(now);
  renewal.setMonth(renewal.getMonth() + 1);

  await prisma.subscription.upsert({
    where: { userId },
    update: {
      plan,
      status: "ACTIVE",
      provider: "paystack",
      providerSubscriptionId: providerSubscriptionId ?? reference,
      startDate: now,
      renewalDate: renewal,
    },
    create: {
      userId,
      plan,
      status: "ACTIVE",
      provider: "paystack",
      providerCustomerId: reference,
      providerSubscriptionId: providerSubscriptionId ?? reference,
      startDate: now,
      renewalDate: renewal,
    },
  });
}

/** Development-mode plan activation (only when Paystack is not configured). */
export async function activatePlanDevMode(userId: string, plan: Plan): Promise<void> {
  if (isPaystackConfigured()) {
    throw new Error("Development mode is disabled when Paystack is configured.");
  }
  const now = new Date();
  const renewal = new Date(now);
  renewal.setMonth(renewal.getMonth() + 1);
  await prisma.subscription.upsert({
    where: { userId },
    update: {
      plan,
      status: "ACTIVE",
      provider: "dev",
      startDate: now,
      renewalDate: renewal,
    },
    create: {
      userId,
      plan,
      status: "ACTIVE",
      provider: "dev",
      startDate: now,
      renewalDate: renewal,
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
