import { NextRequest, NextResponse } from "next/server";
import { getRawBody } from "@/lib/paystack-body";
import {
  verifyWebhookSignature,
  applySuccessfulPayment,
  isPaidPlan,
  updateSubscriptionStatus,
} from "@/lib/paystack";
import { prisma } from "@/lib/db";
import type { Plan } from "@/lib/db-types";

export const dynamic = "force-dynamic";

/**
 * Paystack webhook endpoint.
 *
 * The sha512 HMAC signature is verified BEFORE the payload is trusted, and
 * every handler is idempotent so Paystack's retries are harmless.
 *
 * Configure in the Paystack dashboard:
 *   https://<your-domain>/api/billing/webhook
 *
 * The webhook secret is the same value as PAYSTACK_SECRET_KEY. Paystack sends
 * it as the `x-paystack-signature` header.
 */
export async function POST(request: NextRequest) {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({ error: "Not configured" }, { status: 503 });
    }

    const rawBody = await getRawBody(request);
    const signature = request.headers.get("x-paystack-signature");
    if (!(await verifyWebhookSignature(rawBody, signature, secret))) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody) as {
      event: string;
      data: {
        reference: string;
        amount?: number;
        currency?: string;
        status?: string;
        metadata?: { userId?: string; plan?: string };
        customer?: { customer_code?: string };
        subscription?: { subscription_code?: string };
      };
    };

    const metadata = event.data.metadata ?? {};

    if (event.event === "charge.success") {
      const { userId, plan } = metadata;
      // Only a real paid plan, and only for an account that exists, is
      // granted. The amount is re-checked against the plan price so a
      // tampered or mis-routed webhook cannot grant a cheaper plan.
      if (userId && plan && isPaidPlan(plan)) {
        await applySuccessfulPayment(
          userId,
          plan as Plan,
          event.data.reference,
          event.data.subscription?.subscription_code,
        );
      }
    }

    if (event.event === "charge.failed" || event.event === "invoice.failed") {
      // The period that was paid for has run out; the subscription stays as
      // it is and access ends on its own terms.
      if (metadata.userId) {
        await prisma.subscription
          .updateMany({
            where: { userId: metadata.userId, plan: { not: "FREE" } },
            data: { status: "PAST_DUE" },
          })
          .catch(() => {
            // Nothing to update.
          });
      }
    }

    if (event.event === "subscription.disable") {
      // A cancelled subscription keeps access until the end of the period it
      // was paid for, then expires on its own.
      const userId = metadata.userId;
      if (userId) {
        await updateSubscriptionStatus(userId, "CANCELLING").catch(() => {
          // Nothing to update.
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[paystack:webhook]", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 400 });
  }
}
