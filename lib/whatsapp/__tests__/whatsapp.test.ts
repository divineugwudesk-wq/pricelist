import { describe, it, expect } from "vitest";
import {
  buildOrderMessage,
  buildWhatsAppOrderUrl,
  buildWhatsAppShareUrl,
  buildGenericShareUrl,
  normalizeWhatsAppNumber,
  formatKoboNaira,
} from "@/lib/whatsapp";

const sampleOrder = {
  businessName: "Chuks Kicks",
  whatsappNumber: "0801 234 5678",
  lines: [
    { name: "Bone Straight Wig", quantity: 2, priceKobo: 85_000_00, subtotalKobo: 170_000_00 },
    { name: "Closure", quantity: 1, priceKobo: 30_000_00, subtotalKobo: 30_000_00 },
  ],
  subtotalKobo: 200_000_00,
  discountKobo: 0,
  totalKobo: 200_000_00,
  customerName: "David",
  customerPhone: "080XXXXXXXX",
  customerNote: "Please confirm availability.",
};

describe("WhatsApp number normalization", () => {
  it("converts 0-prefixed Nigerian numbers to 234", () => {
    expect(normalizeWhatsAppNumber("0801 234 5678")).toBe("2348012345678");
  });

  it("accepts +234 format", () => {
    expect(normalizeWhatsAppNumber("+234 801 234 5678")).toBe("2348012345678");
  });

  it("converts 10-digit local numbers", () => {
    expect(normalizeWhatsAppNumber("08012345678")).toBe("2348012345678");
  });

  it("rejects invalid numbers", () => {
    expect(normalizeWhatsAppNumber("")).toBeNull();
    expect(normalizeWhatsAppNumber("abc")).toBeNull();
    expect(normalizeWhatsAppNumber("123")).toBeNull();
  });
});

describe("order message generation", () => {
  it("builds the expected WhatsApp message", () => {
    const message = buildOrderMessage(sampleOrder);
    expect(message).toContain("Hello Chuks Kicks,");
    expect(message).toContain("I'd like to place an order:");
    expect(message).toContain("Bone Straight Wig");
    expect(message).toContain("Quantity: 2");
    expect(message).toContain("Price: ₦85,000");
    expect(message).toContain("Subtotal: ₦170,000");
    expect(message).toContain("Closure");
    expect(message).toContain("Subtotal: ₦30,000");
    expect(message).toContain("TOTAL: ₦200,000");
    expect(message).toContain("Customer: David");
    expect(message).toContain("Phone: 080XXXXXXXX");
    expect(message).toContain("Note: Please confirm availability.");
    expect(message).toContain("Sent via PRICELIST.");
  });

  it("includes discounts when present", () => {
    const message = buildOrderMessage({ ...sampleOrder, discountKobo: 13_000_00 });
    expect(message).toContain("Discount: -₦13,000");
  });

  it("omits optional customer fields when missing", () => {
    const message = buildOrderMessage({
      ...sampleOrder,
      customerName: null,
      customerPhone: null,
      customerNote: null,
    });
    expect(message).not.toContain("Customer:");
    expect(message).not.toContain("Phone:");
    expect(message).not.toContain("Note:");
  });

  it("formats money without decimals for whole naira", () => {
    expect(formatKoboNaira(25_000_00)).toBe("₦25,000");
    expect(formatKoboNaira(1_250_000_00)).toBe("₦1,250,000");
    expect(formatKoboNaira(1_250_50)).toBe("₦1,250.50");
  });
});

describe("WhatsApp URL generation", () => {
  it("builds a click-to-chat URL with the business number", () => {
    const url = buildWhatsAppOrderUrl(sampleOrder);
    expect(url).not.toBeNull();
    expect(url!.startsWith("https://wa.me/2348012345678?text=")).toBe(true);
    // Message must be URL-encoded
    expect(url).toContain(encodeURIComponent("Hello Chuks Kicks,"));
    expect(url).toContain(encodeURIComponent("TOTAL: ₦200,000"));
  });

  it("returns null without a valid WhatsApp number", () => {
    expect(buildWhatsAppOrderUrl({ ...sampleOrder, whatsappNumber: "" })).toBeNull();
    expect(buildWhatsAppOrderUrl({ ...sampleOrder, whatsappNumber: "nope" })).toBeNull();
  });

  it("never hard-codes phone numbers", () => {
    const url = buildWhatsAppOrderUrl({
      ...sampleOrder,
      whatsappNumber: "0703 555 0199",
    });
    expect(url).toContain("wa.me/2347035550199");
  });
});

describe("share URLs", () => {
  it("builds the store share message", () => {
    const url = buildWhatsAppShareUrl("https://pricelist.ng/chuks-kicks", "Chuks Kicks");
    expect(url).toContain("wa.me/?text=");
    expect(url).toContain(encodeURIComponent("Check out my products and prices on PRICELIST"));
    expect(url).toContain(encodeURIComponent("https://pricelist.ng/chuks-kicks"));
  });

  it("builds Facebook and X share URLs", () => {
    const fb = buildGenericShareUrl("facebook", "https://pricelist.ng/chuks-kicks");
    expect(fb).toContain("facebook.com/sharer/sharer.php?u=");
    const x = buildGenericShareUrl("x", "https://pricelist.ng/chuks-kicks", "Chuks Kicks");
    expect(x).toContain("twitter.com/intent/tweet?url=");
    expect(x).toContain(encodeURIComponent("Chuks Kicks"));
  });
});
