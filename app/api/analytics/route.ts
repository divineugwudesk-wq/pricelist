import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server-auth";
import { recordEvent, newSessionId, AnalyticsEventType } from "@/lib/analytics";
import { z } from "zod";

export const dynamic = "force-dynamic";

const eventSchema = z.object({
  businessId: z.string().min(1),
  eventType: z.enum(["STORE_VIEW", "PRODUCT_VIEW", "WHATSAPP_CLICK"]),
  productId: z.string().nullish(),
  sessionId: z.string().nullish(),
});

/**
 * Record storefront analytics events. Lightweight and unauthenticated
 * (storefront visitors have no account) but strictly validated.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = eventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid event." }, { status: 400 });
    }

    // Rate guard: at most ~30 events per session per request burst.
    await recordEvent(parsed.data.businessId, parsed.data.eventType as AnalyticsEventType, {
      productId: parsed.data.productId ?? null,
      sessionId: parsed.data.sessionId ?? newSessionId(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[analytics:POST]", error);
    return NextResponse.json({ error: "Ignored." }, { status: 202 });
  }
}

/** Dashboard analytics summary (authenticated, owner-scoped). */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const days = Number(request.nextUrl.searchParams.get("days") ?? "30");
    const businessId = request.nextUrl.searchParams.get("businessId");

    const business = await prisma.business.findFirst({
      where: {
        id: businessId ?? undefined,
        userId: user.id,
      },
      select: { id: true },
    });
    if (!business) {
      return NextResponse.json({ error: "Business not found." }, { status: 404 });
    }

    const { getStoreAnalytics, rangeForDays } = await import("@/lib/analytics");
    const analytics = await getStoreAnalytics(business.id, rangeForDays(days));
    return NextResponse.json({ analytics });
  } catch (error) {
    console.error("[analytics:GET]", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

import { prisma } from "@/lib/db";
