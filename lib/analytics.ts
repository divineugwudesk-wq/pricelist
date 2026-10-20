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

export async function getStoreAnalytics(
  businessId: string,
  range: AnalyticsRange,
): Promise<StoreAnalytics> {
  const events = await prisma.analyticsEvent.findMany({
    where: { businessId, createdAt: { gte: range.from, lte: range.to } },
    select: { eventType: true, productId: true, sessionId: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  let storeViews = 0;
  let productViews = 0;
  let whatsappClicks = 0;
  const sessions = new Set<string>();
  const productViewsMap = new Map<string, number>();

  for (const e of events) {
    if (e.sessionId) sessions.add(e.sessionId);
    if (e.eventType === "STORE_VIEW") storeViews += 1;
    if (e.eventType === "PRODUCT_VIEW") {
      productViews += 1;
      if (e.productId) productViewsMap.set(e.productId, (productViewsMap.get(e.productId) ?? 0) + 1);
    }
    if (e.eventType === "WHATSAPP_CLICK") whatsappClicks += 1;
  }

  const productNames = await prisma.product.findMany({
    where: { id: { in: [...productViewsMap.keys()] } },
    select: { id: true, name: true },
  });
  const nameById = new Map(productNames.map((p) => [p.id, p.name]));
  const productViewCounts = [...productViewsMap.entries()]
    .map(([productId, views]) => ({
      productId,
      productName: nameById.get(productId) ?? "Deleted product",
      views,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  // Bucket by calendar day.
  const dayMap = new Map<string, { views: number; clicks: number }>();
  for (const e of events) {
    const key = e.createdAt.toISOString().slice(0, 10);
    const bucket = dayMap.get(key) ?? { views: 0, clicks: 0 };
    if (e.eventType === "STORE_VIEW") bucket.views += 1;
    if (e.eventType === "WHATSAPP_CLICK") bucket.clicks += 1;
    dayMap.set(key, bucket);
  }
  const daily = [...dayMap.entries()]
    .map(([date, b]) => ({ date, views: b.views, clicks: b.clicks }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    storeViews,
    productViews,
    whatsappClicks,
    uniqueSessions: sessions.size,
    productViewCounts,
    daily,
  };
}
