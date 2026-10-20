import { describe, it, expect } from "vitest";
import { generateLogoSvg, logoSvgToDataUrl } from "@/lib/logo";
import { getTheme, THEMES } from "@/lib/themes";
import { slugify, uniqueSlug } from "@/lib/utils";
import { getActivePlan } from "@/lib/plans";
import { prisma } from "@/lib/db";

// Note: getActivePlan touches the database; in these unit tests we
// only verify its failure-free export and the pure helpers around it.

describe("authorization model (pure parts)", () => {
  it(
    "exposes plan resolution that defaults to FREE without a subscription",
    async () => {
      // With a non-existent user id the plan falls back to FREE.
      const plan = await getActivePlan("nonexistent-user-id");
      expect(plan).toBe("FREE");
    },
    // The first call opens a pooled connection to Postgres and initialises
    // the WASM query compiler, which can take longer than the default budget.
    30_000,
  );
});

describe("slug utilities", () => {
  it("slugifies business names", () => {
    expect(slugify("Chuks Kicks")).toBe("chuks-kicks");
    expect(slugify("Ada's Beauty!")).toBe("ada-s-beauty");
    expect(slugify("Mama T's Kitchen")).toBe("mama-t-s-kitchen");
  });

  it("creates unique slugs on collision", () => {
    const existing = new Set(["chuks-kicks"]);
    const slug = uniqueSlug("Chuks Kicks", existing);
    expect(slug).not.toBe("chuks-kicks");
    expect(slug.startsWith("chuks-kicks-")).toBe(true);
    expect(uniqueSlug("Fresh Store", existing)).toBe("fresh-store");
  });
});

describe("theme system", () => {
  it("has the required themes", () => {
    for (const id of ["classic", "luxury", "minimal", "dark", "fashion", "restaurant", "modern"]) {
      expect(THEMES[id as keyof typeof THEMES]).toBeDefined();
    }
  });

  it("marks exactly one theme as free", () => {
    const freeThemes = Object.values(THEMES).filter((t) => t.tier === "free");
    expect(freeThemes).toHaveLength(1);
    expect(freeThemes[0].id).toBe("classic");
  });

  it("falls back to classic for unknown theme ids", () => {
    expect(getTheme("nonexistent").id).toBe("classic");
    expect(getTheme(undefined).id).toBe("classic");
    expect(getTheme("dark").id).toBe("dark");
  });

  it("every theme defines the full token set", () => {
    for (const theme of Object.values(THEMES)) {
      const tokens = theme.tokens;
      for (const key of [
        "bg", "surface", "surfaceAlt", "border", "text",
        "textSecondary", "muted", "primary", "primaryHover",
        "onPrimary", "accent", "onAccent", "shadow",
      ]) {
        expect(tokens[key as keyof typeof tokens]).toBeDefined();
      }
    }
  });
});

describe("logo generator", () => {
  it("generates valid SVG with initials", () => {
    const svg = generateLogoSvg({
      businessName: "Chuks Kicks",
      style: "luxury",
      color: "#071A33",
    });
    expect(svg).toContain("<svg");
    expect(svg).toContain("CK");
    expect(svg).toContain("#071A33");
  });

  it("uses light text on dark colors and dark text on light colors", () => {
    const dark = generateLogoSvg({ businessName: "X", style: "modern", color: "#04111F" });
    const light = generateLogoSvg({ businessName: "X", style: "modern", color: "#FFFFFF" });
    expect(dark).toContain("#FFFFFF");
    expect(light).toContain("#071A33");
  });

  it("converts SVG to a data URL", () => {
    const svg = generateLogoSvg({ businessName: "Test", style: "minimal", color: "#C9A45C" });
    const dataUrl = logoSvgToDataUrl(svg);
    expect(dataUrl.startsWith("data:image/svg+xml;base64,")).toBe(true);
    // Round-trip: decode and compare
    const decoded = Buffer.from(dataUrl.split(",")[1], "base64").toString("utf-8");
    expect(decoded).toBe(svg);
  });
});

void prisma;
