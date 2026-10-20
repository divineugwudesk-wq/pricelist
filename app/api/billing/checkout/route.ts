import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, UnauthorizedError } from "@/lib/server-auth";
import {
  isPaystackConfigured,
  isDevBillingAllowed,
  initializeSubscriptionCheckout,
  activatePlanDevMode,
  verifyPaystackTransaction,
  checkPayment,
  applySuccessfulPayment,
} from "@/lib/paystack";
import { PLAN_ORDER, getActivePlan } from "@/lib/plans";
import { z } from "zod";

export const dynamic = "force-dynamic";

const planSchema = z.enum(["STARTER", "PRO"]);

/**
 * Start a checkout for one period of a paid plan.
 *
 * - Paystack configured → returns a real Paystack authorization URL.
 * - Otherwise, if development billing is explicitly enabled → a local
 *   activation, clearly labelled in the UI.
 * - Otherwise → refused. A missing Paystack key must never hand out a paid
 *   plan.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const body = await request.json();
    const parsed = planSchema.safeParse(body.plan);
    if (!parsed.success) {
      return NextResponse.json({ error: "Choose a valid plan." }, { status: 400 });
    }
    const plan = parsed.data;

    // Compare against the plan the account actually has *right now*. A
    // subscription that has expired or been cancelled leaves the account on
    // the Free plan, so it can be bought again.
    const currentPlan = await getActivePlan(user.id);
    if (PLAN_ORDER.indexOf(currentPlan) >= PLAN_ORDER.indexOf(plan)) {
      return NextResponse.json(
        { error: "You already have this plan or higher." },
        { status: 400 },
      );
    }

    if (isPaystackConfigured()) {
      const { authorizationUrl, reference } = await initializeSubscriptionCheckout(
        user.email!,
        plan,
        { userId: user.id },
      );
      return NextResponse.json({
        mode: "paystack",
        authorizationUrl,
        reference,
      });
    }

    if (!isDevBillingAllowed()) {
      return NextResponse.json(
        {
          error:
            "Payments are not available right now. Please try again later or contact support.",
        },
        { status: 503 },
      );
    }

    // Development mode — clearly labelled in the billing UI.
    return NextResponse.json({ mode: "dev", plan });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[billing:checkout]", error);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 500 },
    );
  }
}

/**
 * Apply a plan.
 *
 * With a Paystack reference, the payment is verified against Paystack's API
 * before anything is granted. Without one, this is the development-mode path,
 * which requires the explicit opt-in.
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const body = (await request.json()) as { reference?: string; plan?: string };

    if (body.reference) {
      if (!isPaystackConfigured()) {
        return NextResponse.json(
          { error: "Payments are not available right now." },
          { status: 503 },
        );
      }

      const requestedPlan = planSchema.safeParse(body.plan);
      const verification = await verifyPaystackTransaction(body.reference);
      const check = checkPayment(verification, {
        userId: user.id,
        plan: requestedPlan.success ? requestedPlan.data : undefined,
      });

      if (!check.ok) {
        return NextResponse.json(
          { error: "Payment could not be verified." },
          { status: 400 },
        );
      }

      // Idempotent: the same reference applied twice grants one period only.
      await applySuccessfulPayment(
        user.id,
        check.plan,
        check.reference,
        check.subscriptionCode,
      );

      return NextResponse.json({ ok: true, mode: "paystack", plan: check.plan });
    }

    if (isPaystackConfigured()) {
      return NextResponse.json(
        { error: "Complete checkout through Paystack." },
        { status: 400 },
      );
    }

    if (!isDevBillingAllowed()) {
      return NextResponse.json(
        {
          error:
            "Payments are not available right now. Please try again later or contact support.",
        },
        { status: 503 },
      );
    }

    const parsed = planSchema.safeParse(body.plan);
    if (!parsed.success) {
      return NextResponse.json({ error: "Choose a valid plan." }, { status: 400 });
    }
    await activatePlanDevMode(user.id, parsed.data);
    return NextResponse.json({ ok: true, mode: "dev", plan: parsed.data });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[billing:activate]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
