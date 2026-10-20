import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  checkRateLimit,
  clientAddress,
  addressFromHeaders,
  hashIdentifier,
  enforceRateLimit,
  resetLocalRateLimits,
  RATE_LIMIT_POLICIES,
} from "@/lib/rate-limit";

beforeEach(() => {
  resetLocalRateLimits();
});

afterEach(() => {
  resetLocalRateLimits();
});

describe("client address", () => {
  it("prefers the Cloudflare header", () => {
    const request = new Request("https://example.com", {
      headers: { "cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.1" },
    });
    expect(clientAddress(request)).toBe("203.0.113.7");
  });

  it("falls back to the first forwarded entry", () => {
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "198.51.100.1, 10.0.0.1" },
    });
    expect(clientAddress(request)).toBe("198.51.100.1");
  });

  it("returns unknown when there is no address at all", () => {
    expect(clientAddress(new Request("https://example.com"))).toBe("unknown");
  });

  it("reads a plain header record as well", () => {
    expect(
      addressFromHeaders({ "cf-connecting-ip": "203.0.113.9" }),
    ).toBe("203.0.113.9");
    expect(addressFromHeaders(null)).toBe("unknown");
  });
});

describe("identifier hashing", () => {
  it("does not expose the raw identifier", async () => {
    const hash = await hashIdentifier("someone@example.com");
    expect(hash).not.toContain("someone@example.com");
    expect(hash).toHaveLength(64);
  });

  it("is stable for the same input", async () => {
    expect(await hashIdentifier("a")).toBe(await hashIdentifier("a"));
  });

  it("differs for different inputs", async () => {
    expect(await hashIdentifier("a")).not.toBe(await hashIdentifier("b"));
  });
});

describe("rate limiting", () => {
  it("allows requests up to the limit", async () => {
    const policy = RATE_LIMIT_POLICIES.auth;
    for (let i = 0; i < policy.limit; i++) {
      const result = await checkRateLimit("auth", "same-key");
      expect(result.ok).toBe(true);
    }
  });

  it("blocks requests over the limit", async () => {
    const policy = RATE_LIMIT_POLICIES.auth;
    for (let i = 0; i < policy.limit; i++) {
      await checkRateLimit("auth", "same-key");
    }
    const result = await checkRateLimit("auth", "same-key");
    expect(result.ok).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("counts each identifier separately", async () => {
    const policy = RATE_LIMIT_POLICIES.auth;
    for (let i = 0; i < policy.limit; i++) {
      await checkRateLimit("auth", "key-one");
    }
    const other = await checkRateLimit("auth", "key-two");
    expect(other.ok).toBe(true);
  });

  it("counts each rate limit class separately", async () => {
    const policy = RATE_LIMIT_POLICIES.auth;
    for (let i = 0; i < policy.limit; i++) {
      await checkRateLimit("auth", "shared-key");
    }
    const other = await checkRateLimit("order", "shared-key");
    expect(other.ok).toBe(true);
  });
});

describe("enforceRateLimit", () => {
  it("returns null while the limit is not reached", async () => {
    const request = new Request("https://example.com", {
      headers: { "cf-connecting-ip": "203.0.113.7" },
    });
    expect(await enforceRateLimit(request, "auth", "a@b.com")).toBeNull();
  });

  it("returns a 429 response once the limit is reached", async () => {
    const request = new Request("https://example.com", {
      headers: { "cf-connecting-ip": "203.0.113.7" },
    });
    const policy = RATE_LIMIT_POLICIES.auth;
    for (let i = 0; i < policy.limit; i++) {
      await enforceRateLimit(request, "auth", "a@b.com");
    }
    const limited = await enforceRateLimit(request, "auth", "a@b.com");
    expect(limited).not.toBeNull();
    expect(limited!.status).toBe(429);
    expect(limited!.headers.get("Retry-After")).toBeTruthy();
  });
});
