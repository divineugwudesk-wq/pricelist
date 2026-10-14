import { NextRequest, NextResponse } from "next/server";
import { getRawBody } from "@/lib/paystack-body";
import { verifyWebhookSignature, applySuccessfulPayment } from "@/lib/paystack";

/**
 * Paystack webhook endpoint.
 * Verifies the sha512 HMAC signature BEFORE trusting anything.
 * Configure in the Paystack dashboard:
 *   https://your-domain/api/billing/webhook
 */
export async function POST(request: NextRequest) {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({ error: "Not configured" }, { status: 503 });
    }

    const rawBody = await getRawBody(request);
    const signature = request.headers.get("x-paystack-signature");
    if (!verifyWebhookSignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody) as {
      event: string;
      data: {
        reference: string;
        metadata?: { userId?: string; plan?: "STARTER" | "PRO" };
        customer?: { customer_code?: string };
        subscription?: { subscription_code?: string };
      };
    };

    if (event.event === "charge.success") {
      const { userId, plan } = event.data.metadata ?? {};
      if (userId && plan) {
        await applySuccessfulPayment(
          userId,
          plan,
          event.data.reference,
          event.data.subscription?.subscription_code,
        );
      }
    }

    if (event.event === "subscription.disable") {
      // Handle cancellation in a production build: mark past_due/cancelled.
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[paystack:webhook]", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 400 });
  }
}
