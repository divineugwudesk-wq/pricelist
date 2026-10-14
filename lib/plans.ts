// Subscription plans and server-side limit enforcement.
import type { Plan } from "@/lib/db-types";
import { prisma } from "@/lib/db";

export interface PlanDefinition {
  id: Plan;
  name: string;
  tagline: string;
  priceKobo: number; // monthly, in kobo (₦0, ₦1,500, ₦3,000)
  maxProducts: number | null; // null = unlimited
  maxCategories: number | null;
  features: string[];
  highlights?: string[];
  badge?: string;
  accent?: boolean;
  themeAccess: "free" | "all";
}

export const PLANS: Record<Plan, PlanDefinition> = {
  FREE: {
    id: "FREE",
    name: "Free",
    tagline: "For trying things out",
    priceKobo: 0,
    maxProducts: 5,
    maxCategories: 5,
    themeAccess: "free",
    features: [
      "5 products/services",
      "Public storefront",
      "Unique store link",
      "WhatsApp ordering",
      "Product images",
      "Business logo",
      "Categories",
      "QR code",
      "Basic analytics",
      "PRICELIST branding",
    ],
  },
  STARTER: {
    id: "STARTER",
    name: "Starter",
    tagline: "For growing sellers",
    priceKobo: 150_000,
    maxProducts: 50,
    maxCategories: 25,
    themeAccess: "free",
    badge: "Popular",
    features: [
      "Up to 50 products/services",
      "Everything in Free",
      "Product search",
      "Featured products",
      "Sale prices",
      "Better product organization",
      "Basic analytics",
      "Order history",
      "Custom WhatsApp order message",
    ],
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    tagline: "Best for growing businesses",
    priceKobo: 300_000,
    maxProducts: null,
    maxCategories: null,
    themeAccess: "all",
    badge: "Best for growing businesses",
    features: [
      "Unlimited products/services",
      "Everything in Starter",
      "All premium themes",
      "Full store customization",
      "No PRICELIST branding",
      "Advanced analytics",
      "Hero/banner section",
      "Advanced product organization",
      "Priority support",
    ],
  },
};

export const PLAN_ORDER: Plan[] = ["FREE", "STARTER", "PRO"];

export type LimitFailure =
  | { ok: true }
  | { ok: false; message: string; upgradeTo: Exclude<Plan, "FREE">; currentPlan: Plan };

/**
 * Server-side product-limit enforcement. Returns either ok or a rich
 * failure object used to build the upgrade prompt.
 */
export function checkProductLimit(
  plan: Plan,
  currentCount: number,
  additional = 1,
): LimitFailure {
  const limit = PLANS[plan].maxProducts;
  if (limit === null) return { ok: true };
  if (currentCount + additional <= limit) return { ok: true };
  const upgradeTo = plan === "FREE" ? "STARTER" : "PRO";
  return {
    ok: false,
    currentPlan: plan,
    upgradeTo,
    message: `You've reached the ${limit}-product limit on the ${PLANS[plan].name} plan.`,
  };
}

export function checkCategoryLimit(plan: Plan, currentCount: number): LimitFailure {
  const limit = PLANS[plan].maxCategories;
  if (limit === null) return { ok: true };
  if (currentCount + 1 <= limit) return { ok: true };
  const upgradeTo = plan === "FREE" ? "STARTER" : "PRO";
  return {
    ok: false,
    currentPlan: plan,
    upgradeTo,
    message: `You've reached the ${limit}-category limit on the ${PLANS[plan].name} plan.`,
  };
}

export function canUseTheme(plan: Plan, themeTier: "free" | "pro"): boolean {
  if (themeTier === "free") return true;
  return PLANS[plan].themeAccess === "all";
}

export function isFeatureAvailable(plan: Plan, feature: string): boolean {
  return PLANS[plan].features.some((f) => f.toLowerCase() === feature.toLowerCase());
}

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
