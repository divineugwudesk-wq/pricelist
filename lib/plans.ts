// Subscription plans and server-side limit enforcement.
//
// The plan definitions themselves live in `lib/plan-data.ts` so that client
// components can read prices and features without pulling in Prisma.
import type { Plan } from "@/lib/db-types";
import { prisma } from "@/lib/db";
import { PLANS, PLAN_ORDER } from "@/lib/plan-data";

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

export async function getActivePlan(userId: string): Promise<Plan> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) return "FREE";
  if (sub.status === "ACTIVE" || sub.status === "TRIALING") return sub.plan as Plan;
  return "FREE";
}

/** Monthly recurring revenue in kobo from active paid subscriptions. */
export async function getMRRKobo(): Promise<number> {
  const subs = await prisma.subscription.findMany({
    where: { status: { in: ["ACTIVE", "TRIALING"] } },
    select: { plan: true },
  });
  return subs.reduce((sum, s) => sum + (PLANS[s.plan as Plan]?.priceKobo ?? 0), 0);
}

/** Count of subscriptions per plan (active + trialing). */
export async function getPlanCounts(): Promise<Record<Plan, number>> {
  const subs = await prisma.subscription.findMany({
    where: { status: { in: ["ACTIVE", "TRIALING"] } },
    select: { plan: true },
  });
  const counts: Record<Plan, number> = { FREE: 0, STARTER: 0, PRO: 0 };
  for (const s of subs) counts[s.plan as Plan] += 1;
  return counts;
}
