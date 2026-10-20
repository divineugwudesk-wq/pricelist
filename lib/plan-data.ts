// Plan definitions — pure data, safe to import from client components.
//
// This module deliberately has no database or server imports. Server-only
// helpers live in `lib/plans.ts`, which re-exports everything here.

import type { Plan } from "@/lib/db-types";

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

// Feature lists below describe what the product actually does on each plan.
// If a capability is not enforced in code, it does not belong here.
export const PLANS: Record<Plan, PlanDefinition> = {
  FREE: {
    id: "FREE",
    name: "Free",
    tagline: "For a small catalogue",
    priceKobo: 0,
    maxProducts: 5,
    maxCategories: 5,
    themeAccess: "free",
    features: [
      "5 products/services",
      "Up to 5 categories",
      "Public storefront link",
      "WhatsApp ordering",
      "Product images and sale prices",
      "Storefront search",
      "Order history",
      "QR code",
      "PRICELIST branding on the storefront",
    ],
  },
  STARTER: {
    id: "STARTER",
    name: "Starter",
    tagline: "For a catalogue that is growing",
    priceKobo: 150_000,
    maxProducts: 50,
    maxCategories: 25,
    themeAccess: "free",
    badge: "Popular",
    features: [
      "Everything in Free",
      "Up to 50 products/services",
      "Up to 25 categories",
    ],
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    tagline: "For a full shop",
    priceKobo: 300_000,
    maxProducts: null,
    maxCategories: null,
    themeAccess: "all",
    badge: "Most customisation",
    features: [
      "Everything in Starter",
      "Unlimited products/services",
      "Unlimited categories",
      "All 7 store themes",
      "Accent colour of your choice",
      "Banner image on your storefront",
      "Remove PRICELIST branding",
    ],
  },
};

/** Capabilities that are not limited by plan. */
export const COMMON_FEATURES = [
  "Your own storefront link",
  "WhatsApp ordering",
  "Product photos and descriptions",
  "Categories and search",
  "Sale prices and featured items",
  "Order history and analytics",
  "A QR code for anything you print",
];

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
