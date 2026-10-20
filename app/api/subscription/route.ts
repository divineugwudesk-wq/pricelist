import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, UnauthorizedError } from "@/lib/server-auth";
import { prisma } from "@/lib/db";
import { getActivePlan } from "@/lib/plans";
import { isPaystackConfigured, isDevBillingAllowed } from "@/lib/paystack";
import { isSubscriptionLive } from "@/lib/subscription";

export const dynamic = "force-dynamic";

/** Current user's subscription (for billing + feature gating). */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const [subscription, business] = await Promise.all([
      prisma.subscription.findUnique({ where: { userId: user.id } }),
      prisma.business.findUnique({ where: { userId: user.id }, select: { id: true } }),
    ]);

    const plan = await getActivePlan(user.id);

    return NextResponse.json({
      subscription: subscription ?? null,
      plan,
      businessId: business?.id ?? null,
      paystackConfigured: isPaystackConfigured(),
      // Whether a paid plan can actually be bought right now. The billing page
      // uses this to disable the upgrade buttons instead of offering a
      // checkout that cannot complete.
      billingAvailable: isPaystackConfigured() || isDevBillingAllowed(),
      devBilling: !isPaystackConfigured() && isDevBillingAllowed(),
      paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY ?? null,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[subscription:GET]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

/**
 * Cancel a subscription.
 *
 * Cancelling does not remove access immediately: the period that has already
 * been paid for runs to its end, and the subscription then expires. The
 * status becomes CANCELLING so the dashboard and the access rules agree.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new UnauthorizedError();

    const body = (await request.json()) as { action?: string };
    if (body.action !== "cancel") {
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }

    const sub = await prisma.subscription.findUnique({
      where: { userId: user.id },
      select: { id: true, plan: true, status: true, renewalDate: true },
    });
    if (!sub) {
      return NextResponse.json({ error: "No active subscription." }, { status: 404 });
    }
    if (sub.plan === "FREE") {
      return NextResponse.json({ error: "Free plan cannot be cancelled." }, { status: 400 });
    }
    if (!isSubscriptionLive(sub)) {
      return NextResponse.json(
        { error: "This subscription has already ended." },
        { status: 400 },
      );
    }

    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "CANCELLING" },
    });

    return NextResponse.json({
      ok: true,
      accessUntil: sub.renewalDate?.toISOString() ?? null,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[subscription:POST]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
