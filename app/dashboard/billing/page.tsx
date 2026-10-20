"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { PLANS, PLAN_ORDER } from "@/lib/plan-data";
import type { Plan } from "@/lib/db-types";
import { formatNaira } from "@/lib/money";
import { formatDate as fmtDate } from "@/lib/utils";
import type { SubscriptionStatus } from "@/lib/db-types";
import { Check, CreditCard, ShieldCheck } from "lucide-react";

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
  billingAvailable: boolean;
  devBilling: boolean;
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
  PAST_DUE: "Payment due",
  CANCELLING: "Ends soon",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
  INACTIVE: "Inactive",
};

const PERIOD_DAYS = 30;

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

  /**
   * Coming back from Paystack.
   *
   * Paystack redirects to the callback URL with `paystack=success` and the
   * transaction `reference`. The plan is only activated after the server has
   * verified that payment with Paystack, so the page never claims success on
   * its own.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const state = params.get("paystack");
    const reference = params.get("reference") ?? params.get("trxref");
    if (!state) return;

    if (state === "cancelled") {
      toast.error("Payment cancelled", "You have not been charged.");
      window.history.replaceState({}, "", "/dashboard/billing");
      return;
    }

    if (state !== "success" || !reference) {
      toast.error("Payment not completed", "We could not confirm the payment. Please try again.");
      window.history.replaceState({}, "", "/dashboard/billing");
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/billing/checkout", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference }),
        });
        const result = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          toast.error(
            result.error ?? "Payment could not be verified",
            "If you were charged, contact support and we will sort it out.",
          );
        } else {
          toast.success(
            `${PLANS[result.plan as Plan]?.name ?? "Your plan"} is active`,
            `You have ${PERIOD_DAYS} days of access. Pay again to continue after that.`,
          );
        }
        await load();
      } catch {
        if (!cancelled) {
          toast.error("Could not verify the payment", "Please try again in a moment.");
        }
      } finally {
        window.history.replaceState({}, "", "/dashboard/billing");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [load, toast]);

  async function upgrade(plan: Plan) {
    if (!data) return;
    if (!data.billingAvailable) {
      toast.error(
        "Payments are not available right now",
        "Please try again later or contact support.",
      );
      return;
    }
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
        `Development mode (Paystack is not configured).\n\nActivate the ${PLANS[plan].name} plan (₦${PLANS[plan].priceKobo / 100} for ${PERIOD_DAYS} days) for this account? In production this would be a real Paystack payment.`,
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
        `You have ${PERIOD_DAYS} days of access. Pay again to continue after that.`,
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
      `Cancel your subscription?\n\nYou'll keep your plan until ${data.subscription?.renewalDate ? fmtDate(data.subscription.renewalDate) : "the end of the period"}, then return to Free (5 products). We do not charge you automatically, so nothing else will be taken.`,
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
        const result = await res.json().catch(() => ({}));
        toast.error(result.error ?? "Could not cancel", "Please try again.");
        return;
      }
      toast.success(
        "Subscription cancelled",
        "You'll stay on your plan until the end of the period.",
      );
      await load();
    } finally {
      setCancelling(false);
    }
  }

  if (loading || !data) {
    return (
      <DashboardLayout userName={null}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-40 rounded-lg bg-neutral-100" />
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
        <h1 className="font-heading text-headline font-semibold text-ink">
          Billing
        </h1>
        <p className="mt-1 text-caption text-ink-muted">
          Manage your plan and subscription. Secure payments by Paystack.
        </p>
      </div>

      {/* Current plan summary */}
      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardBody className="py-6">
            <p className="text-caption font-medium text-ink-muted">Current plan</p>
            <div className="mt-2 flex items-center gap-2">
              <p className="font-heading text-headline font-semibold text-ink">
                {PLANS[currentPlan].name}
              </p>
              <Badge tone={currentPlan === "FREE" ? "neutral" : "gold"}>
                {sub ? STATUS_LABELS[sub.status] : "Active"}
              </Badge>
            </div>
            <p className="mt-1 text-body text-ink-secondary">
              {formatNaira(PLANS[currentPlan].priceKobo)}/month
            </p>
            {sub?.renewalDate && currentPlan !== "FREE" && (
              <p className="mt-2 text-caption text-ink-muted">
                Access ends {fmtDate(sub.renewalDate)}
              </p>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-6">
            <p className="text-caption font-medium text-ink-muted">Product usage</p>
            <p className="mt-2 font-heading text-headline font-semibold text-ink">
              {usage?.products ?? 0}
              <span className="text-base font-medium text-ink-muted">
                {" "}
                / {usage?.limit ?? "∞"}
              </span>
            </p>
            {usage?.limit !== null && usage?.limit !== undefined && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
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
            <p className="mt-2 text-caption text-ink-muted">
              {usage?.categories ?? 0} categories used
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-6">
            <p className="text-caption font-medium text-ink-muted">Payment</p>
            <div className="mt-2 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-navy-700" />
              <p className="text-body font-medium text-ink">
                {data.paystackConfigured ? "Paystack" : "Development mode"}
              </p>
            </div>
            <p className="mt-1.5 text-caption leading-relaxed text-ink-muted">
              {data.paystackConfigured
                ? "Payments are processed securely by Paystack. We never see your card details."
                : data.devBilling
                  ? "Paystack is not configured. Plan changes apply locally for development only."
                  : "Payments are not available right now. Please try again later or contact support."}
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
              className={`flex flex-col ${featured && !isCurrent ? "border-navy-700" : ""}`}
            >
              <CardBody className="flex flex-1 flex-col py-6">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-heading text-lead font-semibold text-ink">{plan.name}</p>
                  {isCurrent ? (
                    <Badge tone="success" dot>
                      Current
                    </Badge>
                  ) : plan.badge ? (
                    <Badge tone={featured ? "gold" : "neutral"}>{plan.badge}</Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-caption text-ink-muted">{plan.tagline}</p>
                <p className="mt-4">
                  <span className="font-heading text-display font-semibold text-ink">
                    {formatNaira(plan.priceKobo)}
                  </span>
                  <span className="text-caption text-ink-muted">/month</span>
                </p>
                {plan.priceKobo > 0 && (
                  <p className="mt-1 text-caption text-ink-muted">
                    One payment covers {PERIOD_DAYS} days. Pay again to continue.
                  </p>
                )}
                <ul className="mt-5 flex-1 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-caption text-ink-secondary">
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
                    variant="primary"
                    className="mt-6 w-full"
                    size="lg"
                    loading={checkingOut === planId}
                    disabled={!data.billingAvailable}
                    onClick={() => void upgrade(planId)}
                  >
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

      <div className="mt-8 flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-5">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
        <div>
          <p className="text-body font-medium text-ink">Secure payments</p>
          <p className="mt-0.5 text-caption leading-relaxed text-ink-muted">
            Payments are in NGN through Paystack — the same payment infrastructure
            used by Nigerian banks. Your card details never touch PRICELIST
            servers. We never charge you automatically: each payment covers{" "}
            {PERIOD_DAYS} days, and you can cancel at any time to keep the days
            you have already paid for.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
