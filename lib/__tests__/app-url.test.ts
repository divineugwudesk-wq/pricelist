import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { absoluteUrl, appUrl, isAppUrlConfigured, safeRedirectPath } from "@/lib/app-url";

const KEYS = [
  "NEXT_PUBLIC_APP_URL",
  "APP_URL",
  "NEXTAUTH_URL",
] as const;

const original: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of KEYS) {
    original[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of KEYS) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

describe("application origin", () => {
  it("prefers NEXT_PUBLIC_APP_URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://pricelist.ng/";
    process.env.APP_URL = "https://other.example";
    expect(appUrl()).toBe("https://pricelist.ng");
  });

  it("falls back to APP_URL and then NEXTAUTH_URL", () => {
    process.env.APP_URL = "https://workers.example";
    expect(appUrl()).toBe("https://workers.example");
    delete process.env.APP_URL;
    process.env.NEXTAUTH_URL = "https://nextauth.example";
    expect(appUrl()).toBe("https://nextauth.example");
  });

  it("falls back to localhost when nothing is configured", () => {
    expect(appUrl()).toBe("http://localhost:3000");
    expect(isAppUrlConfigured()).toBe(false);
  });

  it("reports a configured origin", () => {
    process.env.APP_URL = "https://workers.example";
    expect(isAppUrlConfigured()).toBe(true);
  });
});

describe("absolute URLs", () => {
  it("builds a link on the application origin", () => {
    process.env.APP_URL = "https://pricelist.ng";
    expect(absoluteUrl("/reset-password?token=abc")).toBe(
      "https://pricelist.ng/reset-password?token=abc",
    );
  });

  it("ignores a value that is not a path", () => {
    process.env.APP_URL = "https://pricelist.ng";
    expect(absoluteUrl("https://evil.example/x")).toBe("https://pricelist.ng");
  });

  it("ignores a protocol-relative path", () => {
    process.env.APP_URL = "https://pricelist.ng";
    expect(absoluteUrl("//evil.example/x")).toBe("https://pricelist.ng");
  });
});

describe("redirect targets", () => {
  it("keeps a same-site path", () => {
    expect(safeRedirectPath("/dashboard/products")).toBe("/dashboard/products");
  });

  it("rejects an absolute URL", () => {
    expect(safeRedirectPath("https://evil.example")).toBe("/dashboard");
  });

  it("rejects a protocol-relative URL", () => {
    expect(safeRedirectPath("//evil.example")).toBe("/dashboard");
  });

  it("rejects a backslash trick", () => {
    expect(safeRedirectPath("/\\evil.example")).toBe("/dashboard");
  });

  it("falls back when nothing is supplied", () => {
    expect(safeRedirectPath(null)).toBe("/dashboard");
    expect(safeRedirectPath(undefined)).toBe("/dashboard");
  });
});
