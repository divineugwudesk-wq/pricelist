import { describe, it, expect } from "vitest";
import {
  formatNaira,
  formatNairaCompact,
  parseNairaToKobo,
  lineTotal,
  addKobo,
} from "@/lib/money";

describe("naira formatting", () => {
  it("formats whole amounts without decimals", () => {
    expect(formatNaira(1_500_00)).toBe("₦1,500");
    expect(formatNaira(25_000_00)).toBe("₦25,000");
    expect(formatNaira(1_250_000_00)).toBe("₦1,250,000");
  });

  it("formats fractional kobo with two decimals", () => {
    expect(formatNaira(1_250_50)).toBe("₦1,250.50");
  });

  it("handles zero and nullish values", () => {
    expect(formatNaira(0)).toBe("₦0");
    expect(formatNaira(null)).toBe("₦0");
    expect(formatNaira(undefined)).toBe("₦0");
  });

  it("handles negative amounts", () => {
    expect(formatNaira(-5_000_00)).toBe("-₦5,000");
  });

  it("compacts large amounts", () => {
    expect(formatNairaCompact(1_200_000_00)).toBe("₦1.2m");
    expect(formatNairaCompact(45_000_00)).toBe("₦45k");
    expect(formatNairaCompact(900_00)).toBe("₦900");
  });
});

describe("parsing", () => {
  it("parses comma-separated naira input into kobo", () => {
    expect(parseNairaToKobo("25,000")).toBe(2_500_000);
    expect(parseNairaToKobo("₦1,250,000")).toBe(125_000_000);
    expect(parseNairaToKobo("4500")).toBe(450_000);
    expect(parseNairaToKobo("3,500.50")).toBe(350_050);
  });

  it("handles numbers and garbage", () => {
    expect(parseNairaToKobo(100)).toBe(10_000);
    expect(parseNairaToKobo("")).toBe(0);
    expect(parseNairaToKobo("abc")).toBe(0);
  });
});

describe("integer-safe arithmetic", () => {
  it("computes line totals", () => {
    expect(lineTotal(25_000_00, 3)).toBe(75_000_00);
    expect(lineTotal(25_000_00, 0)).toBe(0);
    expect(lineTotal(25_000_00, -2)).toBe(0);
  });

  it("sums kobo values", () => {
    expect(addKobo(1_000, 2_000, 3_000)).toBe(6_000);
  });
});
