import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const subscriptionState = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    subscription: subscriptionState,
  },
}));

import {
  applySuccessfulPayment,
  checkPayment,
  isDevBillingAllowed,
  isPaystackConfigured,
  verifyWebhookSignature,
} from "@/lib/paystack";
import { PLANS } from "@/lib/plan-data";

const ORIGINAL_SECRET = process.env.PAYSTACK_SECRET_KEY;
const ORIGINAL_ALLOW_DEV = process.env.ALLOW_DEV_BILLING;
const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

beforeEach(() => {
  subscriptionState.findUnique.mockReset();
  subscriptionState.upsert.mockReset();
  subscriptionState.findUnique.mockResolvedValue(null);
  subscriptionState.upsert.mockResolvedValue({});
  vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_placeholder");
});

afterEach(() => {
  vi.restoreAllMocks();
  if (ORIGINAL_SECRET !== undefined) {
    vi.stubEnv("PAYSTACK_SECRET_KEY", ORIGINAL_SECRET);
  } else {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "");
  }
  if (ORIGINAL_ALLOW_DEV !== undefined) {
    vi.stubEnv("ALLOW_DEV_BILLING", ORIGINAL_ALLOW_DEV);
  } else {
    vi.stubEnv("ALLOW_DEV_BILLING", "");
  }
  if (ORIGINAL_NODE_ENV !== undefined) {
    vi.stubEnv("NODE_ENV", ORIGINAL_NODE_ENV);
  }
});

function transaction(overrides: Record<string, unknown> = {}) {
  return {
    status: true,
    data: {
      reference: "pl_reference123",
      status: "success",
      amount: PLANS.PRO.priceKobo,
      currency: "NGN",
      metadata: { userId: "user-1", plan: "PRO" },
      ...overrides,
    },
  };
}

describe("configuration", () => {
  it("reports Paystack as configured when the key is set", () => {
    expect(isPaystackConfigured()).toBe(true);
  });

  it("reports Paystack as unconfigured without a key", () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "");
    expect(isPaystackConfigured()).toBe(false);
  });
});

describe("development billing", () => {
  it("is off by default", () => {
    vi.stubEnv("ALLOW_DEV_BILLING", "");
    expect(isDevBillingAllowed()).toBe(false);
  });

  it("is on only with the explicit opt-in", () => {
    vi.stubEnv("ALLOW_DEV_BILLING", "true");
    vi.stubEnv("NODE_ENV", "development");
    expect(isDevBillingAllowed()).toBe(true);
  });

  it("is always off in production", () => {
    vi.stubEnv("ALLOW_DEV_BILLING", "true");
    vi.stubEnv("NODE_ENV", "production");
    expect(isDevBillingAllowed()).toBe(false);
  });
});

describe("payment verification", () => {
  it("refuses when Paystack is not configured", () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "");
    const result = checkPayment(transaction(), { userId: "user-1" });
    expect(result).toEqual({ ok: false, reason: "not-configured" });
  });

  it("refuses when there is no transaction", () => {
    const result = checkPayment(null, { userId: "user-1" });
    expect(result).toEqual({ ok: false, reason: "no-transaction" });
  });

  it("refuses a transaction that was not successful", () => {
    const result = checkPayment(
      transaction({ status: "failed" }),
      { userId: "user-1" },
    );
    expect(result).toEqual({ ok: false, reason: "not-successful" });
  });

  it("refuses a payment made for another account", () => {
    const result = checkPayment(
      transaction({ metadata: { userId: "user-2", plan: "PRO" } }),
      { userId: "user-1" },
    );
    expect(result).toEqual({ ok: false, reason: "wrong-account" });
  });

  it("refuses a plan that is not a paid plan", () => {
    const result = checkPayment(
      transaction({ metadata: { userId: "user-1", plan: "FREE" } }),
      { userId: "user-1" },
    );
    expect(result).toEqual({ ok: false, reason: "wrong-plan" });
  });

  it("refuses a plan that is not the one expected", () => {
    const result = checkPayment(transaction(), { userId: "user-1", plan: "STARTER" });
    expect(result).toEqual({ ok: false, reason: "wrong-plan" });
  });

  it("refuses an amount that does not match the plan price", () => {
    const result = checkPayment(transaction({ amount: 1 }), { userId: "user-1" });
    expect(result).toEqual({ ok: false, reason: "wrong-amount" });
  });

  it("refuses an amount for a different plan", () => {
    const result = checkPayment(
      transaction({
        amount: PLANS.STARTER.priceKobo,
        metadata: { userId: "user-1", plan: "PRO" },
      }),
      { userId: "user-1" },
    );
    expect(result).toEqual({ ok: false, reason: "wrong-amount" });
  });

  it("refuses a currency that is not NGN", () => {
    const result = checkPayment(transaction({ currency: "USD" }), { userId: "user-1" });
    expect(result).toEqual({ ok: false, reason: "wrong-currency" });
  });

  it("accepts a payment that matches every expectation", () => {
    const result = checkPayment(transaction(), { userId: "user-1" });
    expect(result).toEqual({
      ok: true,
      plan: "PRO",
      reference: "pl_reference123",
      subscriptionCode: undefined,
    });
  });
});

describe("webhook signatures", () => {
  it("rejects a missing signature", async () => {
    expect(await verifyWebhookSignature("{}", null, "secret")).toBe(false);
  });

  it("rejects a signature that is not sha512", async () => {
    expect(await verifyWebhookSignature("{}", "sha1=abc", "secret")).toBe(false);
  });

  it("rejects a wrong signature", async () => {
    expect(await verifyWebhookSignature("{}", "sha512=deadbeef", "secret")).toBe(false);
  });

  it("accepts a correct signature", async () => {
    const body = JSON.stringify({ event: "charge.success" });
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode("secret"),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"],
    );
    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(body),
    );
    const hex = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    expect(await verifyWebhookSignature(body, `sha512=${hex}`, "secret")).toBe(true);
  });
});

describe("applying a successful payment", () => {
  it("does nothing when the same reference is applied twice", async () => {
    subscriptionState.findUnique.mockResolvedValue({
      plan: "PRO",
      status: "ACTIVE",
      startDate: new Date(),
      renewalDate: new Date(),
      providerSubscriptionId: "pl_reference123",
    });

    await applySuccessfulPayment("user-1", "PRO", "pl_reference123");

    expect(subscriptionState.upsert).not.toHaveBeenCalled();
  });

  it("starts a period when there was no subscription", async () => {
    subscriptionState.findUnique.mockResolvedValue(null);

    await applySuccessfulPayment("user-1", "PRO", "pl_reference123");

    expect(subscriptionState.upsert).toHaveBeenCalledTimes(1);
    const call = subscriptionState.upsert.mock.calls[0][0];
    expect(call.create.plan).toBe("PRO");
    expect(call.create.status).toBe("ACTIVE");
    expect(call.create.providerSubscriptionId).toBe("pl_reference123");
    const renewal = call.create.renewalDate as Date;
    const days = (renewal.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29);
    expect(days).toBeLessThan(31);
  });

  it("extends from the current period end when renewing early", async () => {
    const currentEnd = new Date(Date.now() + 10 * 86_400_000);
    subscriptionState.findUnique.mockResolvedValue({
      plan: "PRO",
      status: "ACTIVE",
      startDate: new Date(),
      renewalDate: currentEnd,
      providerSubscriptionId: "pl_older",
    });

    await applySuccessfulPayment("user-1", "PRO", "pl_reference123");

    const call = subscriptionState.upsert.mock.calls[0][0];
    const renewal = call.update.renewalDate as Date;
    const days = (renewal.getTime() - currentEnd.getTime()) / 86_400_000;
    expect(days).toBeCloseTo(30, 0);
  });

  it("keeps the original start date", async () => {
    const start = new Date("2026-01-01T00:00:00.000Z");
    subscriptionState.findUnique.mockResolvedValue({
      plan: "PRO",
      status: "ACTIVE",
      startDate: start,
      renewalDate: new Date(),
      providerSubscriptionId: "pl_older",
    });

    await applySuccessfulPayment("user-1", "PRO", "pl_reference123");

    const call = subscriptionState.upsert.mock.calls[0][0];
    expect(call.update.startDate).toBe(start);
  });
});
