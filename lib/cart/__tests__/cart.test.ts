import { describe, it, expect } from "vitest";
import {
  calculateCart,
  effectivePrice,
  MAX_CART_QUANTITY,
  MAX_CART_LINES,
} from "@/lib/cart";

describe("effective price (sale price calculation)", () => {
  it("uses the sale price when it is lower", () => {
    expect(effectivePrice({ priceKobo: 100_000, salePriceKobo: 80_000 })).toBe(80_000);
  });

  it("ignores a sale price equal to or above the regular price", () => {
    expect(effectivePrice({ priceKobo: 100_000, salePriceKobo: 100_000 })).toBe(100_000);
    expect(effectivePrice({ priceKobo: 100_000, salePriceKobo: 150_000 })).toBe(100_000);
  });

  it("ignores zero or null sale prices", () => {
    expect(effectivePrice({ priceKobo: 100_000, salePriceKobo: 0 })).toBe(100_000);
    expect(effectivePrice({ priceKobo: 100_000, salePriceKobo: null })).toBe(100_000);
  });
});

describe("cart calculation", () => {
  it("calculates subtotal, total and item count", () => {
    const totals = calculateCart([
      { productId: "1", name: "Sneakers", priceKobo: 45_000_00, salePriceKobo: null, quantity: 2 },
      { productId: "2", name: "Hoodie", priceKobo: 32_000_00, salePriceKobo: null, quantity: 1 },
    ]);
    expect(totals.subtotalKobo).toBe(122_000_00);
    expect(totals.totalKobo).toBe(122_000_00);
    expect(totals.itemCount).toBe(3);
    expect(totals.lines).toHaveLength(2);
  });

  it("applies sale prices and tracks savings", () => {
    const totals = calculateCart([
      { productId: "1", name: "Wig", priceKobo: 85_000_00, salePriceKobo: 72_000_00, quantity: 2 },
    ]);
    expect(totals.subtotalKobo).toBe(144_000_00);
    expect(totals.savingsKobo).toBe(26_000_00); // (85k-72k) × 2
    expect(totals.totalKobo).toBe(144_000_00);
  });

  it("keeps integer math (no floating point)", () => {
    const totals = calculateCart([
      { productId: "1", name: "Rice", priceKobo: 3_500_00, salePriceKobo: null, quantity: 3 },
    ]);
    expect(Number.isInteger(totals.totalKobo)).toBe(true);
    expect(totals.totalKobo).toBe(10_500_00);
  });

  it("clamps quantity to the maximum", () => {
    const totals = calculateCart([
      { productId: "1", name: "X", priceKobo: 1_000, salePriceKobo: null, quantity: 10_000 },
    ]);
    expect(totals.lines[0].quantity).toBe(MAX_CART_QUANTITY);
  });

  it("coerces invalid quantities to 1", () => {
    const totals = calculateCart([
      { productId: "1", name: "X", priceKobo: 1_000, salePriceKobo: null, quantity: 0 },
    ]);
    expect(totals.lines[0].quantity).toBe(1);
  });

  it("limits the number of cart lines", () => {
    const many = Array.from({ length: 300 }, (_, i) => ({
      productId: `p${i}`,
      name: `Product ${i}`,
      priceKobo: 1_000,
      salePriceKobo: null,
      quantity: 1,
    }));
    const totals = calculateCart(many);
    expect(totals.lines.length).toBeLessThanOrEqual(MAX_CART_LINES);
  });

  it("handles an empty cart", () => {
    const totals = calculateCart([]);
    expect(totals.subtotalKobo).toBe(0);
    expect(totals.totalKobo).toBe(0);
    expect(totals.itemCount).toBe(0);
  });

  it("mixes sale and regular items correctly", () => {
    const totals = calculateCart([
      { productId: "1", name: "A", priceKobo: 10_000_00, salePriceKobo: 8_000_00, quantity: 1 },
      { productId: "2", name: "B", priceKobo: 5_000_00, salePriceKobo: null, quantity: 2 },
      { productId: "3", name: "C", priceKobo: 20_000_00, salePriceKobo: 15_000_00, quantity: 1 },
    ]);
    // 8,000 + 10,000 + 15,000 = 33,000 naira
    expect(totals.subtotalKobo).toBe(33_000_00);
    // savings: 2,000 + 5,000 = 7,000 naira
    expect(totals.savingsKobo).toBe(7_000_00);
  });
});
