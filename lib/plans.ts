// Subscription plans and server-side limit enforcement.
//
// The plan definitions themselves live in `lib/plan-data.ts` so that client
// components can read prices and features without pulling in Prisma.
import type { Plan } from "@/lib/db-types";
import { prisma } from "@/lib/db";
import { PLANS, PLAN_ORDER } from "@/lib/plan-data";
import { effectivePlan, isSubscriptionLive } from "@/lib/subscription";

export {
  PLANS,
  PLAN_ORDER,
  COMMON_FEATURES,
  checkProductLimit,
  checkCategoryLimit,
  canUseTheme,
  isFeatureAvailable,
} from "@/lib/plan-data";
export type { PlanDefinition, LimitFailure } from "@/lib/plan-data";

/** Subscription is usable for paid features only when active/trialling. */
export type EffectivePlan = Plan;

/**
 * The plan a user is entitled to right now.
 *
 * A paid plan is only honoured while its period is running. When the period
 * has ended the subscription is marked as expired so the dashboard and the
 * admin panel show the truth, and the caller falls back to the Free plan.
 */
export async function getActivePlan(userId: string): Promise<Plan> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) return "FREE";

  const live = isSubscriptionLive(sub);
  if (!live && sub.status !== "FREE" && sub.status !== "EXPIRED" && sub.status !== "CANCELLED") {
    // The period has run out. Record it so the state is accurate everywhere.
    await prisma.subscription
      .update({ where: { userId }, data: { status: "EXPIRED" } })
      .catch(() => {
        // A concurrent request may have updated the row already.
      });
  }

  return effectivePlan(sub);
}

/** Monthly recurring revenue in kobo from live paid subscriptions. */
export async function getMRRKobo(): Promise<number> {
  const subs = await prisma.subscription.findMany({
    where: { status: { in: ["ACTIVE", "TRIALING", "CANCELLING"] } },
    select: { plan: true, renewalDate: true },
  });
  const now = new Date();
  return subs.reduce((sum, s) => {
    if (!isSubscriptionLive({ ...s, status: "ACTIVE" }, now)) return sum;
    return sum + (PLANS[s.plan as Plan]?.priceKobo ?? 0);
  }, 0);
}

/** Count of subscriptions per plan (live only). */
export async function getPlanCounts(): Promise<Record<Plan, number>> {
  const subs = await prisma.subscription.findMany({
    where: { status: { in: ["ACTIVE", "TRIALING", "CANCELLING"] } },
    select: { plan: true, renewalDate: true },
  });
  const now = new Date();
  const counts: Record<Plan, number> = { FREE: 0, STARTER: 0, PRO: 0 };
  for (const s of subs) {
    if (!isSubscriptionLive({ ...s, status: "ACTIVE" }, now)) continue;
    counts[s.plan as Plan] += 1;
  }
  return counts;
}
