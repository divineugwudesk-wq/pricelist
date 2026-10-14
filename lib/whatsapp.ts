// WhatsApp integration layer.
// MVP: click-to-chat URLs with encoded pre-filled order messages.
// Future: WhatsApp Business Platform API — implement sendOrder() behind
// WHATSAPP_APP_ID/WHATSAPP_APP_SECRET env keys without touching callers.

export interface WhatsAppOrderLine {
  name: string;
  quantity: number;
  priceKobo: number;
  subtotalKobo: number;
}

export interface WhatsAppOrderPayload {
  businessName: string;
  whatsappNumber: string;
  lines: WhatsAppOrderLine[];
  subtotalKobo: number;
  discountKobo?: number;
  totalKobo: number;
  customerName?: string | null;
  customerPhone?: string | null;
  customerNote?: string | null;
}

const NAIRA = "₦";

export function formatKoboNaira(kobo: number): string {
  const naira = Math.round(kobo) / 100;
  return `${NAIRA}${naira.toLocaleString("en-NG", {
    minimumFractionDigits: naira % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Normalize a Nigerian phone number to international format digits (234...). */
export function normalizeWhatsAppNumber(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 0) return null;
  if (digits.startsWith("0")) digits = `234${digits.slice(1)}`;
  else if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.length === 10) digits = `234${digits}`;
  if (!/^\d{11,15}$/.test(digits)) return null;
  return digits;
}

/** Build the full WhatsApp order message (also used for previews & tests). */
export function buildOrderMessage(order: WhatsAppOrderPayload): string {
  const lines: string[] = [];
  lines.push(`Hello ${order.businessName},`);
  lines.push("");
  lines.push("I'd like to place an order:");
  lines.push("");
  for (const line of order.lines) {
    lines.push(`${line.name}`);
    lines.push(`Quantity: ${line.quantity}`);
    lines.push(`Price: ${formatKoboNaira(line.priceKobo)}`);
    lines.push(`Subtotal: ${formatKoboNaira(line.subtotalKobo)}`);
    lines.push("");
  }
  if (order.discountKobo && order.discountKobo > 0) {
    lines.push(`Discount: -${formatKoboNaira(order.discountKobo)}`);
    lines.push("");
  }
  lines.push(`TOTAL: ${formatKoboNaira(order.totalKobo)}`);
  lines.push("");
  if (order.customerName) {
    lines.push(`Customer: ${order.customerName}`);
  }
  if (order.customerPhone) {
    lines.push(`Phone: ${order.customerPhone}`);
  }
  if (order.customerNote) {
    lines.push(`Note: ${order.customerNote}`);
  }
  lines.push("");
  lines.push("Sent via PRICELIST.");
  return lines.join("\n");
}

/** Click-to-chat URL for an order. Returns null when the business has no valid WhatsApp number. */
export function buildWhatsAppOrderUrl(order: WhatsAppOrderPayload): string | null {
  const number = normalizeWhatsAppNumber(order.whatsappNumber);
  if (!number) return null;
  const message = buildOrderMessage(order);
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/** Share-the-store message + URL used by business owners. */
export function buildShareMessage(storeUrl: string, businessName: string): string {
  return `Check out my products and prices on PRICELIST 👇\n${storeUrl}`;
}

export function buildWhatsAppShareUrl(storeUrl: string, businessName: string): string {
  return `https://wa.me/?text=${encodeURIComponent(buildShareMessage(storeUrl, businessName))}`;
}

export function buildGenericShareUrl(platform: "facebook" | "x" | "linkedin", url: string, title?: string): string {
  const encoded = encodeURIComponent(url);
  switch (platform) {
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encoded}`;
    case "x":
      return `https://twitter.com/intent/tweet?url=${encoded}${title ? `&text=${encodeURIComponent(title)}` : ""}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`;
  }
}
