// Subscription term rules.
//
// These are pure functions so the entitlement rules can be unit tested
// without a database.
//
// The billing model is deliberately explicit: one successful payment buys one
// period of access. There is no automatic renewal, and the application does
// not pretend otherwise — `renewalDate` is the moment the paid period ends,
// and access stops then unless the customer pays again.

import type { Plan, SubscriptionStatus } from "@/lib/db-types";

/** How long one payment covers, in days. */
export const SUBSCRIPTION_PERIOD_DAYS = 30;

/** The end of the period that starts at `from`. */
export function periodEnd(from: Date, days: number = SUBSCRIPTION_PERIOD_DAYS): Date {
  const end = new Date(from.getTime());
  end.setDate(end.getDate() + days);
  return end;
}

/** Statuses that can carry paid access while the period is still running. */
const LIVE_STATUSES: SubscriptionStatus[] = ["ACTIVE", "TRIALING", "CANCELLING"];

export interface SubscriptionSnapshot {
  plan: string;
  status: string;
  renewalDate: Date | null;
}

/**
 * Whether a subscription currently carries paid access.
 *
 * A subscription is live when its status allows it *and* its period has not
 * ended. `renewalDate` is what makes this work: a subscription that was paid
 * for once stops being live at the end of that period.
 */
export function isSubscriptionLive(
  subscription: SubscriptionSnapshot,
  now: Date = new Date(),
): boolean {
  if (!LIVE_STATUSES.includes(subscription.status as SubscriptionStatus)) return false;
  if (subscription.plan === "FREE") return false;
  if (!subscription.renewalDate) return false;
  return subscription.renewalDate.getTime() > now.getTime();
}

/** The plan a subscription grants right now. */
export function effectivePlan(
  subscription: SubscriptionSnapshot | null,
  now: Date = new Date(),
): Plan {
  if (!subscription) return "FREE";
  if (!isSubscriptionLive(subscription, now)) return "FREE";
  return subscription.plan as Plan;
}

/**
 * The end of the next period.
 *
 * Renewing before the current period ends extends from the current end date
 * rather than from today, so paying early never shortens the subscription.
 */
export function nextPeriodEnd(
  currentRenewalDate: Date | null,
  now: Date = new Date(),
  days: number = SUBSCRIPTION_PERIOD_DAYS,
): Date {
  const base =
    currentRenewalDate && currentRenewalDate.getTime() > now.getTime()
      ? currentRenewalDate
      : now;
  return periodEnd(base, days);
}

/** A human sentence describing when access ends. */
export function describeAccessEnd(
  subscription: SubscriptionSnapshot | null,
  now: Date = new Date(),
): string | null {
  if (!subscription || !isSubscriptionLive(subscription, now)) return null;
  return subscription.renewalDate!.toISOString();
}
