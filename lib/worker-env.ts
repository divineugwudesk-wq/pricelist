// Access to the Cloudflare Workers runtime bindings.
//
// OpenNext publishes the current request context in an AsyncLocalStorage
// exposed on globalThis under "__cloudflare-context__". The store carries the
// Worker `env`, which is where bindings such as HYPERDRIVE and the rate
// limiters live.

const CONTEXT_SYMBOL = Symbol.for("__cloudflare-context__");

/** The Cloudflare rate limiting binding. */
export interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface WorkerEnv {
  HYPERDRIVE?: { connectionString?: string };
  RATE_LIMITER_AUTH?: RateLimitBinding;
  RATE_LIMITER_ORDER?: RateLimitBinding;
  RATE_LIMITER_EVENT?: RateLimitBinding;
}

export interface WorkerContext {
  env?: WorkerEnv;
}

export function getWorkerContext(): WorkerContext | undefined {
  const store = (globalThis as unknown as Record<symbol, unknown>)[CONTEXT_SYMBOL];
  return store && typeof store === "object" ? (store as WorkerContext) : undefined;
}

export function getWorkerEnv(): WorkerEnv | undefined {
  return getWorkerContext()?.env;
}

/** True inside the Cloudflare Workers runtime. */
export function isWorkersRuntime(): boolean {
  return (
    typeof navigator !== "undefined" &&
    navigator.userAgent === "Cloudflare-Workers"
  );
}
