// Browser-side analytics tracking.
//
// The browser cannot reach the database, so events are posted to the public
// `/api/analytics` endpoint, which records them server-side. Failures are
// swallowed: tracking must never interrupt a customer ordering.

export type AnalyticsEventType = "STORE_VIEW" | "PRODUCT_VIEW" | "WHATSAPP_CLICK";

export function trackEvent(
  businessId: string,
  eventType: AnalyticsEventType,
  opts: { productId?: string | null; sessionId?: string | null } = {},
): void {
  try {
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId,
        eventType,
        productId: opts.productId ?? null,
        sessionId: opts.sessionId ?? null,
      }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // ignore
  }
}
