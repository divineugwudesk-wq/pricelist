import { describe, it, expect } from "vitest";
import {
  checkProductLimit,
  checkCategoryLimit,
  canUseTheme,
  PLANS,
  PLAN_ORDER,
  isFeatureAvailable,
} from "@/lib/plans";

describe("product limit enforcement", () => {
  it("allows up to 5 products on Free", () => {
    expect(checkProductLimit("FREE", 0).ok).toBe(true);
    expect(checkProductLimit("FREE", 4).ok).toBe(true);
    expect(checkProductLimit("FREE", 5).ok).toBe(false);
    expect(checkProductLimit("FREE", 10).ok).toBe(false);
  });

  it("allows up to 50 products on Starter", () => {
    expect(checkProductLimit("STARTER", 49).ok).toBe(true);
    expect(checkProductLimit("STARTER", 50).ok).toBe(false);
  });

  it("allows unlimited products on Pro", () => {
    expect(checkProductLimit("PRO", 10_000).ok).toBe(true);
    expect(checkProductLimit("PRO", 1_000_000).ok).toBe(true);
  });

  it("returns a useful upgrade message with the next plan", () => {
    const result = checkProductLimit("FREE", 5);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("5-product limit");
      expect(result.message).toContain("Free");
      expect(result.upgradeTo).toBe("STARTER");
      expect(result.currentPlan).toBe("FREE");
    }
  });

  it("suggests Pro when already on Starter", () => {
    const result = checkProductLimit("STARTER", 50);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.upgradeTo).toBe("PRO");
  });

  it("counts additional items", () => {
    expect(checkProductLimit("FREE", 3, 2).ok).toBe(true); // 3+2=5 exactly at limit
    expect(checkProductLimit("FREE", 3, 3).ok).toBe(false); // 3+3=6 over limit
  });

  it("enforces category limits", () => {
    expect(checkCategoryLimit("FREE", 5).ok).toBe(false);
    expect(checkCategoryLimit("FREE", 4).ok).toBe(true);
    expect(checkCategoryLimit("PRO", 999).ok).toBe(true);
  });
});

describe("theme access", () => {
  it("lets everyone use free themes", () => {
    expect(canUseTheme("FREE", "free")).toBe(true);
    expect(canUseTheme("STARTER", "free")).toBe(true);
    expect(canUseTheme("PRO", "free")).toBe(true);
  });

  it("restricts Pro themes to Pro", () => {
    expect(canUseTheme("FREE", "pro")).toBe(false);
    expect(canUseTheme("STARTER", "pro")).toBe(false);
    expect(canUseTheme("PRO", "pro")).toBe(true);
  });
});

describe("plan definitions", () => {
  it("prices are correct in kobo", () => {
    expect(PLANS.FREE.priceKobo).toBe(0);
    expect(PLANS.STARTER.priceKobo).toBe(150_000); // ₦1,500
    expect(PLANS.PRO.priceKobo).toBe(300_000); // ₦3,000
  });

  it("has a sensible plan order", () => {
    expect(PLAN_ORDER).toEqual(["FREE", "STARTER", "PRO"]);
  });

  it("advertises the Free plan features", () => {
    const features = PLANS.FREE.features.join(" ").toLowerCase();
    expect(features).toContain("5 products");
    expect(features).toContain("whatsapp ordering");
    expect(features).toContain("qr code");
  });

  it("marks Starter as popular", () => {
    expect(PLANS.STARTER.badge).toBe("Popular");
  });

  it("recognizes features per plan", () => {
    expect(isFeatureAvailable("FREE", "5 products/services")).toBe(true);
    expect(isFeatureAvailable("FREE", "unlimited products/services")).toBe(false);
    expect(isFeatureAvailable("PRO", "unlimited products/services")).toBe(true);
  });
});
