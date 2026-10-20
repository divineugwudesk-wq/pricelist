// Analytics service. Events are stored in the database and aggregated
// for the dashboard/admin. No third-party dependency required.
//
// This module is server-only. Browser code uses `lib/analytics-client.ts`,
// which posts events to the API route.

import { prisma } from "@/lib/db";
import type { AnalyticsEventType } from "@/lib/analytics-client";

export type { AnalyticsEventType };

export function newSessionId(): string {
  return crypto.randomUUID();
}

export async function recordEvent(
  businessId: string,
  eventType: AnalyticsEventType,
  opts: { productId?: string | null; sessionId?: string | null; metadata?: Record<string, unknown> | null } = {},
): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        businessId,
        eventType,
        productId: opts.productId ?? null,
        sessionId: opts.sessionId ?? null,
        metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
      },
    });
  } catch {
    // Analytics must never break the storefront.
  }
}

export interface AnalyticsRange {
  from: Date;
  to: Date;
}

export function rangeForDays(days: number): AnalyticsRange {
  const to = new Date();
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return { from, to };
}

export interface StoreAnalytics {
  storeViews: number;
  productViews: number;
  whatsappClicks: number;
  uniqueSessions: number;
  productViewCounts: { productId: string; productName: string; views: number }[];
  daily: { date: string; views: number; clicks: number }[];
}

/**
 * Aggregate a store's analytics.
 *
 * The aggregation happens in the database. The previous implementation loaded
 * every event row into the Worker and counted them in JavaScript, which made
 * the dashboard slower and more expensive the busier a store became. These
 * queries are bounded by the indexes on (businessId, createdAt) and
 * (businessId, eventType, createdAt) and never return more than a handful of
 * rows.
 *
 * Daily buckets use the business's own timezone, so a Lagos seller sees
 * midnight at 01:00 UTC rather than at 00:00 UTC.
 */
export async function getStoreAnalytics(
  businessId: string,
  range: AnalyticsRange,
): Promise<StoreAnalytics> {
  const from = range.from;
  const to = range.to;

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { timezone: true },
  });
  const timezone = business?.timezone ?? "Africa/Lagos";

  // Totals per event type.
  const typeCounts = await prisma.$queryRaw<
    { eventType: string; count: bigint }[]
  >`
    SELECT "eventType", COUNT(*)::bigint AS count
    FROM "AnalyticsEvent"
    WHERE "businessId" = ${businessId}
      AND "createdAt" >= ${from}
      AND "createdAt" <= ${to}
    GROUP BY "eventType"
  `;

  const countsByType = new Map(
    typeCounts.map((row) => [row.eventType, Number(row.count)]),
  );
  const storeViews = countsByType.get("STORE_VIEW") ?? 0;
  const productViews = countsByType.get("PRODUCT_VIEW") ?? 0;
  const whatsappClicks = countsByType.get("WHATSAPP_CLICK") ?? 0;

  // Unique sessions: distinct visitor session ids in the range. A session id
  // is a random value the browser generates per visit, so this counts
  // distinct sessions rather than pretending to identify people.
  const [sessionRow] = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(DISTINCT "sessionId")::bigint AS count
    FROM "AnalyticsEvent"
    WHERE "businessId" = ${businessId}
      AND "createdAt" >= ${from}
      AND "createdAt" <= ${to}
      AND "sessionId" IS NOT NULL
  `;
  const uniqueSessions = sessionRow ? Number(sessionRow.count) : 0;

  // The most viewed products.
  const groupedProducts = await prisma.analyticsEvent.groupBy({
    by: ["productId"],
    where: {
      businessId,
      eventType: "PRODUCT_VIEW",
      createdAt: { gte: from, lte: to },
      productId: { not: null },
    },
    _count: { productId: true },
    orderBy: { _count: { productId: "desc" } },
    take: 10,
  });

  const productIds = groupedProducts
    .map((row) => row.productId)
    .filter((id): id is string => Boolean(id));

  const productNames = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds }, businessId },
        select: { id: true, name: true },
      })
    : [];
  const nameById = new Map(productNames.map((p) => [p.id, p.name]));

  const productViewCounts = groupedProducts
    .map((row) => ({
      productId: row.productId as string,
      productName: nameById.get(row.productId as string) ?? "Deleted product",
      views: row._count.productId,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  // Daily buckets, in the business's timezone so the calendar day matches
  // what a Lagos seller expects (UTC would put midnight at 01:00 local).
  const dailyRows = await prisma.$queryRaw<
    { date: string; views: bigint; clicks: bigint }[]
  >`
    SELECT
      to_char(date_trunc('day', "createdAt" AT TIME ZONE ${timezone}), 'YYYY-MM-DD') AS date,
      COUNT(*) FILTER (WHERE "eventType" = 'STORE_VIEW')::bigint AS views,
      COUNT(*) FILTER (WHERE "eventType" = 'WHATSAPP_CLICK')::bigint AS clicks
    FROM "AnalyticsEvent"
    WHERE "businessId" = ${businessId}
      AND "createdAt" >= ${from}
      AND "createdAt" <= ${to}
    GROUP BY 1
    ORDER BY 1
  `;

  const daily = dailyRows.map((row) => ({
    date: row.date,
    views: Number(row.views),
    clicks: Number(row.clicks),
  }));

  return {
    storeViews,
    productViews,
    whatsappClicks,
    uniqueSessions,
    productViewCounts,
    daily,
  };
}
