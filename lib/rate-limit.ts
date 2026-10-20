// Rate limiting for the public endpoints.
//
// Two backends, picked at runtime:
//
//   * In the Cloudflare Workers runtime, the platform's own rate limiting
//     binding does the counting. It is distributed across isolates, so it
//     holds up under load and against distributed abuse.
//   * Everywhere else (local development, scripts, tests) an in-process
//     counter does the same job.
//
// The identifier is hashed before it is used as a key, so neither the binding
// nor the in-process map ever holds a raw email address or IP address.
//
// The limiter is defence in depth, not the primary control. If the backend
// itself errors the request is allowed through and the error is logged: a
// broken limiter must not take a storefront offline.

import { getWorkerEnv, type RateLimitBinding, type WorkerEnv } from "@/lib/worker-env";

export type RateLimitClass = "auth" | "order" | "event";

export interface RateLimitPolicy {
  /** Requests allowed per window. */
  limit: number;
  /** Window length in seconds. */
  periodSeconds: number;
}

export const RATE_LIMIT_POLICIES: Record<RateLimitClass, RateLimitPolicy> = {
  // Account creation, sign-in and password reset.
  auth: { limit: 10, periodSeconds: 60 },
  // Public order submission.
  order: { limit: 20, periodSeconds: 60 },
  // Analytics events.
  event: { limit: 60, periodSeconds: 60 },
};

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the window resets. */
  resetSeconds: number;
}

const BINDINGS: Record<RateLimitClass, keyof WorkerEnv> = {
  auth: "RATE_LIMITER_AUTH",
  order: "RATE_LIMITER_ORDER",
  event: "RATE_LIMITER_EVENT",
};

/** In-process fallback, used when no platform binding is available. */
const localCounters = new Map<string, { count: number; resetAt: number }>();

const MAX_LOCAL_ENTRIES = 10_000;

/** Hash an identifier so no raw email address or IP address is stored. */
export async function hashIdentifier(identifier: string): Promise<string> {
  const data = new TextEncoder().encode(identifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * The client address, as seen by the edge.
 *
 * `CF-Connecting-IP` is set by Cloudflare and cannot be spoofed by the
 * client. `x-forwarded-for` is the fallback for other deployments; only its
 * first entry is used.
 */
export function clientAddress(request: Request): string {
  return addressFromHeaders(request.headers);
}

/**
 * The same, but for a header collection that may be a `Headers` object or a
 * plain record (NextAuth passes the latter).
 */
export function addressFromHeaders(
  headers: Headers | Record<string, string> | null | undefined,
): string {
  if (!headers) return "unknown";

  const read = (name: string): string | null => {
    if (typeof (headers as Headers).get === "function") {
      return (headers as Headers).get(name);
    }
    const record = headers as Record<string, string>;
    const value = record[name] ?? record[name.toLowerCase()];
    return typeof value === "string" ? value : null;
  };

  const cf = read("cf-connecting-ip");
  if (cf) return cf.trim();
  const forwarded = read("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return "unknown";
}

function localLimit(
  key: string,
  policy: RateLimitPolicy,
  now: number,
): RateLimitResult {
  const existing = localCounters.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + policy.periodSeconds * 1000;
    if (localCounters.size >= MAX_LOCAL_ENTRIES) {
      // Drop the oldest entries rather than growing without bound.
      for (const [k, v] of localCounters) {
        if (v.resetAt <= now) localCounters.delete(k);
      }
      if (localCounters.size >= MAX_LOCAL_ENTRIES) {
        const oldest = localCounters.keys().next();
        if (!oldest.done) localCounters.delete(oldest.value);
      }
    }
    localCounters.set(key, { count: 1, resetAt });
    return {
      ok: true,
      limit: policy.limit,
      remaining: policy.limit - 1,
      resetSeconds: policy.periodSeconds,
    };
  }

  existing.count += 1;
  const remaining = Math.max(0, policy.limit - existing.count);
  return {
    ok: existing.count <= policy.limit,
    limit: policy.limit,
    remaining,
    resetSeconds: Math.max(0, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

/**
 * Count one request against a policy.
 *
 * `identifier` should be the thing being limited — an IP address, an email
 * address, or both joined. It is hashed before use.
 */
export async function checkRateLimit(
  rateLimitClass: RateLimitClass,
  identifier: string,
): Promise<RateLimitResult> {
  const policy = RATE_LIMIT_POLICIES[rateLimitClass];
  const key = await hashIdentifier(`${rateLimitClass}:${identifier}`);
  const now = Date.now();

  const bindingName = BINDINGS[rateLimitClass];
  const binding = getWorkerEnv()?.[bindingName] as RateLimitBinding | undefined;

  if (binding) {
    try {
      const { success } = await binding.limit({ key });
      return {
        ok: success,
        limit: policy.limit,
        remaining: success ? policy.limit - 1 : 0,
        resetSeconds: policy.periodSeconds,
      };
    } catch (error) {
      // A failing limiter must not take the site down.
      console.error(
        "[rate-limit] backend error:",
        error instanceof Error ? error.message : "unknown error",
      );
      return {
        ok: true,
        limit: policy.limit,
        remaining: policy.limit,
        resetSeconds: policy.periodSeconds,
      };
    }
  }

  return localLimit(key, policy, now);
}

/** Standard headers for a rate limited response. */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.resetSeconds),
  };
}

/**
 * Apply a policy to a request.
 *
 * Returns a 429 response when the limit is exceeded, and `null` when the
 * request may continue. Keeping the shape of the response in one place means
 * every protected endpoint answers the same way.
 */
export async function enforceRateLimit(
  request: Request,
  rateLimitClass: RateLimitClass,
  identifier?: string,
): Promise<Response | null> {
  const subject = identifier
    ? `${clientAddress(request)}|${identifier.toLowerCase()}`
    : clientAddress(request);

  const result = await checkRateLimit(rateLimitClass, subject);
  if (result.ok) return null;

  return new Response(
    JSON.stringify({
      error: "Too many requests",
      message: "Please wait a moment and try again.",
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.resetSeconds),
        ...rateLimitHeaders(result),
      },
    },
  );
}

/** Clear the in-process counters. Used by tests. */
export function resetLocalRateLimits(): void {
  localCounters.clear();
}
