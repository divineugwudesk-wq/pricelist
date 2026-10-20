import { describe, it, expect } from "vitest";
import {
  SUBSCRIPTION_PERIOD_DAYS,
  effectivePlan,
  isSubscriptionLive,
  nextPeriodEnd,
  periodEnd,
} from "@/lib/subscription";

const now = new Date("2026-01-15T00:00:00.000Z");

describe("subscription periods", () => {
  it("covers 30 days", () => {
    expect(SUBSCRIPTION_PERIOD_DAYS).toBe(30);
    expect(periodEnd(now).toISOString()).toBe("2026-02-14T00:00:00.000Z");
  });

  it("extends from the current period end when renewing early", () => {
    const currentEnd = new Date("2026-02-01T00:00:00.000Z");
    expect(nextPeriodEnd(currentEnd, now).toISOString()).toBe(
      "2026-03-03T00:00:00.000Z",
    );
  });

  it("starts a new period when the current one has ended", () => {
    const pastEnd = new Date("2026-01-01T00:00:00.000Z");
    expect(nextPeriodEnd(pastEnd, now).toISOString()).toBe(
      "2026-02-14T00:00:00.000Z",
    );
  });

  it("starts a new period when there was no previous one", () => {
    expect(nextPeriodEnd(null, now).toISOString()).toBe("2026-02-14T00:00:00.000Z");
  });
});

describe("live subscriptions", () => {
  it("is live while the period is running", () => {
    expect(
      isSubscriptionLive(
        { plan: "PRO", status: "ACTIVE", renewalDate: new Date("2026-02-01") },
        now,
      ),
    ).toBe(true);
  });

  it("is not live once the period has ended", () => {
    expect(
      isSubscriptionLive(
        { plan: "PRO", status: "ACTIVE", renewalDate: new Date("2026-01-01") },
        now,
      ),
    ).toBe(false);
  });

  it("is not live when the status does not allow it", () => {
    for (const status of ["CANCELLED", "EXPIRED", "PAST_DUE", "INACTIVE"]) {
      expect(
        isSubscriptionLive(
          { plan: "PRO", status, renewalDate: new Date("2026-02-01") },
          now,
        ),
      ).toBe(false);
    }
  });

  it("stays live while a cancellation is running out", () => {
    expect(
      isSubscriptionLive(
        { plan: "PRO", status: "CANCELLING", renewalDate: new Date("2026-02-01") },
        now,
      ),
    ).toBe(true);
  });

  it("is not live without a renewal date", () => {
    expect(
      isSubscriptionLive({ plan: "PRO", status: "ACTIVE", renewalDate: null }, now),
    ).toBe(false);
  });

  it("is never live for the free plan", () => {
    expect(
      isSubscriptionLive(
        { plan: "FREE", status: "ACTIVE", renewalDate: new Date("2026-02-01") },
        now,
      ),
    ).toBe(false);
  });
});

describe("effective plan", () => {
  it("falls back to FREE without a subscription", () => {
    expect(effectivePlan(null, now)).toBe("FREE");
  });

  it("returns the paid plan while the period runs", () => {
    expect(
      effectivePlan(
        { plan: "STARTER", status: "ACTIVE", renewalDate: new Date("2026-02-01") },
        now,
      ),
    ).toBe("STARTER");
  });

  it("returns FREE after the period has ended", () => {
    expect(
      effectivePlan(
        { plan: "STARTER", status: "ACTIVE", renewalDate: new Date("2026-01-01") },
        now,
      ),
    ).toBe("FREE");
  });

  it("returns FREE after a cancellation has run out", () => {
    expect(
      effectivePlan(
        {
          plan: "PRO",
          status: "CANCELLING",
          renewalDate: new Date("2026-01-01"),
        },
        now,
      ),
    ).toBe("FREE");
  });
});
