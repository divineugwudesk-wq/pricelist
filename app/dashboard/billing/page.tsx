"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { PLANS, PLAN_ORDER } from "@/lib/plans";
import type { Plan } from "@/lib/db-types";
import { formatNaira } from "@/lib/money";
import { formatDate as fmtDate } from "@/lib/utils";
import type { SubscriptionStatus } from "@/lib/db-types";
import { Check, CreditCard, ShieldCheck, Sparkles } from "lucide-react";

interface SubscriptionData {
  subscription: {
    id: string;
    plan: Plan;
    status: SubscriptionStatus;
    provider: string;
    startDate: string | null;
    renewalDate: string | null;
    createdAt: string;
  } | null;
  plan: Plan;
  businessId: string | null;
  paystackConfigured: boolean;
  paystackPublicKey: string | null;
}

interface UsageData {
  products: number;
  categories: number;
  limit: number | null;
}

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  ACTIVE: "Active",
  TRIALING: "Trialing",
  PAST_DUE: "Past due",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
  INACTIVE: "Inactive",
};

export default function BillingPage() {
  const toast = useToast();
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<Plan | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [subRes, prodRes, catRes] = await Promise.all([
        fetch("/api/subscription"),
        fetch("/api/products"),
        fetch("/api/categories"),
      ]);
      const subData: SubscriptionData = await subRes.json();
      const prodData = await prodRes.json();
      const catData = await catRes.json();
      setData(subData);
      setUsage({
        products: (prodData.products ?? []).length,
        categories: (catData.categories ?? []).length,
        limit: prodData.limit ?? null,
      });
    } catch {
      toast.error("Could not load billing", "Please try again.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function upgrade(plan: Plan) {
    if (!data) return;
    setCheckingOut(plan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(result.error ?? "Could not start checkout", "Please try again.");
        return;
      }
      if (result.mode === "paystack") {
        // Real payment flow — redirect to Paystack.
        window.location.href = result.authorizationUrl as string;
        return;
      }
      // Development mode — confirm and apply locally.
      const confirmed = window.confirm(
        `Development mode (Paystack is not configured).\n\nActivate the ${PLANS[plan].name} plan (₦${PLANS[plan].priceKobo / 100}/month) for this account? In production this would be a real Paystack payment.`,
      );
      if (!confirmed) return;
      const applyRes = await fetch("/api/billing/checkout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!applyRes.ok) {
        toast.error("Could not activate plan", "Please try again.");
        return;
      }
      toast.success(
        `${PLANS[plan].name} activated`,
        "Your plan limits and features are now updated.",
      );
      await load();
    } catch {
      toast.error("Something went wrong", "Please try again.");
    } finally {
      setCheckingOut(null);
    }
  }

  async function cancel() {
    if (!data) return;
    const confirmed = window.confirm(
      "Cancel your subscription? You'll keep your plan until the end of the billing period, then return to Free (5 products).",
    );
    if (!confirmed) return;
    setCancelling(true);
    try {
      const res = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (!res.ok) {
        toast.error("Could not cancel", "Please try again.");
        return;
      }
      toast.success("Subscription cancelled", "You'll stay on your plan until renewal.");
      await load();
    } finally {
      setCancelling(false);
    }
  }

  if (loading || !data) {
    return (
      <DashboardLayout userName={null}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-40 rounded-lg bg-navy-100" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const currentPlan = data.plan;
  const currentIndex = PLAN_ORDER.indexOf(currentPlan);
  const sub = data.subscription;

  return (
    <DashboardLayout userName={null}>
      <div className="mb-7">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-navy-900">
          Billing
        </h1>
        <p className="mt-1 text-[13px] text-ink-muted">
          Manage your plan and subscription. Secure payments by Paystack.
        </p>
      </div>

      {/* Current plan summary */}
      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardBody className="py-6">
            <p className="text-[13px] font-medium text-ink-muted">Current plan</p>
            <div className="mt-2 flex items-center gap-2">
              <p className="font-heading text-2xl font-bold text-navy-900">
                {PLANS[currentPlan].name}
              </p>
              <Badge tone={currentPlan === "FREE" ? "muted" : "gold"}>
                {sub ? STATUS_LABELS[sub.status] : "Active"}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-ink-secondary">
              {formatNaira(PLANS[currentPlan].priceKobo)}/month
            </p>
            {sub?.renewalDate && (
              <p className="mt-2 text-xs text-ink-muted">
                Renews {fmtDate(sub.renewalDate)}
              </p>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-6">
            <p className="text-[13px] font-medium text-ink-muted">Product usage</p>
            <p className="mt-2 font-heading text-2xl font-bold text-navy-900">
              {usage?.products ?? 0}
              <span className="text-base font-medium text-ink-muted">
                {" "}
                / {usage?.limit ?? "∞"}
              </span>
            </p>
            {usage?.limit !== null && usage?.limit !== undefined && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-navy-100">
                <div
                  className={`h-full rounded-full ${
                    (usage?.products ?? 0) >= (usage?.limit ?? 0) ? "bg-gold" : "bg-navy-800"
                  }`}
                  style={{
                    width: `${Math.min(100, ((usage?.products ?? 0) / (usage?.limit ?? 1)) * 100)}%`,
                  }}
                />
              </div>
            )}
            <p className="mt-2 text-xs text-ink-muted">
              {usage?.categories ?? 0} categories used
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-6">
            <p className="text-[13px] font-medium text-ink-muted">Payment</p>
            <div className="mt-2 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-navy-700" />
              <p className="text-sm font-medium text-ink">
                {data.paystackConfigured ? "Paystack" : "Development mode"}
              </p>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
              {data.paystackConfigured
                ? "Payments are processed securely by Paystack. We never see your card details."
                : "Paystack is not configured. Plan changes apply locally for development."}
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Upgrade cards */}
      <p className="mb-4 font-heading text-lg font-semibold text-navy-900">
        {currentPlan === "FREE" ? "Upgrade your plan" : "Change plan"}
      </p>
      <div className="grid gap-5 md:grid-cols-3">
        {PLAN_ORDER.map((planId) => {
          const plan = PLANS[planId];
          const isCurrent = planId === currentPlan;
          const accessible = PLAN_ORDER.indexOf(planId) > currentIndex;
          const featured = planId === "STARTER";
          return (
            <Card
              key={planId}
              className={`relative flex flex-col ${featured && !isCurrent ? "border-navy-900 shadow-lift" : ""}`}
            >
              {plan.badge && !isCurrent && (
                <span
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-semibold ${
                    featured ? "bg-navy-900 text-white" : "bg-gold-faint text-gold-deep"
                  }`}
                >
                  {plan.badge}
                </span>
              )}
              <CardBody className="flex flex-1 flex-col py-6">
                <div className="flex items-center justify-between">
                  <p className="font-heading text-lg font-semibold text-ink">{plan.name}</p>
                  {isCurrent && <Badge tone="success" dot>Current</Badge>}
                </div>
                <p className="mt-3">
                  <span className="font-heading text-3xl font-bold tracking-tight text-navy-900">
                    {formatNaira(plan.priceKobo)}
                  </span>
                  <span className="text-sm text-ink-muted">/month</span>
                </p>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-[13px] text-ink-secondary">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      {feature}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  planId !== "FREE" && (
                    <Button variant="outline" className="mt-6 w-full" onClick={() => void cancel()} loading={cancelling}>
                      Cancel subscription
                    </Button>
                  )
                ) : accessible ? (
                  <Button
                    variant={featured ? "gold" : "primary"}
                    className="mt-6 w-full"
                    size="lg"
                    loading={checkingOut === planId}
                    onClick={() => void upgrade(planId)}
                  >
                    <Sparkles className="h-4 w-4" />
                    Upgrade to {plan.name}
                  </Button>
                ) : (
                  <Button variant="ghost" className="mt-6 w-full" disabled>
                    Included in your plan
                  </Button>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 flex items-start gap-3 rounded-2xl border border-navy-100 bg-white p-5">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
        <div>
          <p className="text-sm font-medium text-ink">Secure payments</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-ink-muted">
            Subscriptions are billed in NGN through Paystack — the same payment
            infrastructure used by Nigerian banks. Your card details never touch
            PRICELIST servers. Cancel anytime; your plan stays active until the
            end of the period.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
