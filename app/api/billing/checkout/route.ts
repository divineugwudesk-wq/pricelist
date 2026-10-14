import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, UnauthorizedError } from "@/lib/server-auth";
import { prisma } from "@/lib/db";
import {
  isPaystackConfigured,
  initializeSubscriptionCheckout,
  activatePlanDevMode,
  verifyPaystackTransaction,
  applySuccessfulPayment,
} from "@/lib/paystack";
import { PLANS, PLAN_ORDER } from "@/lib/plans";
import type { Plan } from "@/lib/db-types";
import { z } from "zod";

const planSchema = z.enum(["STARTER", "PRO"]);

/**
 * Start a subscription checkout.
 * - Paystack configured → returns a real Paystack authorization URL.
 * - Otherwise → development mode; the client confirms and we apply
 *   the plan directly (clearly labelled in the UI).
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

    const current = await prisma.subscription.findUnique({
      where: { userId: user.id },
      select: { plan: true, status: true },
    });
    const currentPlan = current?.plan as Plan | null;
    if (currentPlan && PLAN_ORDER.indexOf(currentPlan) >= PLAN_ORDER.indexOf(plan)) {
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

    // Development mode — clearly labelled in billing UI.
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
 * Apply a plan in development mode, or verify a completed Paystack
 * payment when returning from the Paystack checkout page.
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const body = await request.json();

    if (isPaystackConfigured() && body.reference) {
      const verification = await verifyPaystackTransaction(body.reference);
      const data = verification?.data;
      if (
        !verification?.status ||
        data?.status !== "success" ||
        data?.metadata?.userId !== user.id
      ) {
        return NextResponse.json(
          { error: "Payment could not be verified." },
          { status: 400 },
        );
      }
      await applySuccessfulPayment(
        user.id,
        data.metadata.plan ?? "STARTER",
        data.reference,
        data.subscription?.subscription_code,
      );
      return NextResponse.json({ ok: true, mode: "paystack" });
    }

    if (isPaystackConfigured()) {
      return NextResponse.json(
        { error: "Complete checkout through Paystack." },
        { status: 400 },
      );
    }

    const parsed = planSchema.safeParse(body.plan);
    if (!parsed.success) {
      return NextResponse.json({ error: "Choose a valid plan." }, { status: 400 });
    }
    await activatePlanDevMode(user.id, parsed.data);
    return NextResponse.json({ ok: true, mode: "dev" });
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
