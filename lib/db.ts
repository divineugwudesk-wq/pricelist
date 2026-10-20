// Prisma client wiring.
//
// Two Cloudflare Workers constraints shape this file:
//
// 1. The native Prisma query engine cannot be loaded inside workerd, so the
//    client is generated with `engineType = "client"` (WASM query compiler)
//    and talks to Postgres through the `pg` driver adapter over the Node.js
//    TCP/TLS APIs that the `nodejs_compat` flag exposes.
//
// 2. Workers does not allow a TCP socket to be shared between requests, so
//    the client and its connection pool must be created per request.
//    OpenNext publishes the current request context in an AsyncLocalStorage
//    exposed on globalThis under "__cloudflare-context__". That store is a
//    fresh object for every request, which makes it the right place to hang a
//    request-scoped client. Outside Workers (`next dev`, scripts) the client
//    is a plain module-level singleton, like on any Node.js server.
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import type { PoolConfig } from "pg";

const CONTEXT_SYMBOL = Symbol.for("__cloudflare-context__");

interface RequestScope {
  ctx?: { waitUntil?: (promise: Promise<unknown>) => void };
  prismaClient?: PrismaClient;
  prismaPool?: Pool;
}

const globalForPrisma = globalThis as unknown as {
  prismaClient?: PrismaClient;
  prismaPool?: Pool;
};

/** The OpenNext request store, or undefined outside a Workers request. */
function currentRequestScope(): RequestScope | undefined {
  const store = (globalThis as unknown as Record<symbol, unknown>)[CONTEXT_SYMBOL];
  return store && typeof store === "object" ? (store as RequestScope) : undefined;
}

/**
 * `pg-connection-string` turns `sslmode=require` into `ssl: {}`, which makes
 * node:tls verify the server certificate. The Workers runtime terminates TLS
 * at the edge, so certificate handling belongs to the platform. Dropping the
 * parameter and setting the option explicitly keeps local and edge behaviour
 * identical regardless of how the connection string is written.
 */
function buildPoolConfig(connectionString: string): PoolConfig {
  const withoutSslMode = connectionString
    .replace(/([?&])sslmode=[^&]*/, "$1")
    .replace(/\?&/, "?")
    .replace(/[?&]$/, "");

  return {
    connectionString: withoutSslMode,
    ssl: { rejectUnauthorized: false },
    max: 1,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
  };
}

function createClient(): { client: PrismaClient; pool: Pool } {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add it to the Worker runtime variables, and to .env for local development.",
    );
  }

  const pool = new Pool(buildPoolConfig(connectionString));
  const client = new PrismaClient({
    adapter: new PrismaPg(pool),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  return { client, pool };
}

async function closeClient(client: PrismaClient, pool: Pool): Promise<void> {
  try {
    await client.$disconnect();
  } catch {
    // the connection may already be gone
  }
  try {
    await pool.end();
  } catch {
    // the pool may already be closed
  }
}

/** Release the request-scoped client once the response has been produced. */
function scheduleCleanup(
  scope: RequestScope,
  client: PrismaClient,
  pool: Pool,
): void {
  const cleanup = closeClient(client, pool);
  const waitUntil = scope.ctx?.waitUntil;
  if (typeof waitUntil === "function") {
    try {
      waitUntil.call(scope.ctx, cleanup);
      return;
    } catch {
      // waitUntil() is unavailable once the response has been returned
    }
  }
  void cleanup;
}

/** The client for the current request (or the process-wide one outside Workers). */
export function getPrismaClient(): PrismaClient {
  const scope = currentRequestScope();

  if (!scope) {
    if (!globalForPrisma.prismaClient) {
      const { client, pool } = createClient();
      globalForPrisma.prismaClient = client;
      globalForPrisma.prismaPool = pool;
    }
    return globalForPrisma.prismaClient;
  }

  if (!scope.prismaClient) {
    const { client, pool } = createClient();
    scope.prismaClient = client;
    scope.prismaPool = pool;
    scheduleCleanup(scope, client, pool);
  }

  return scope.prismaClient;
}

/**
 * Shared Prisma client.
 *
 * Exposed as a proxy so that call sites keep using `prisma.user.findMany(...)`
 * while the underlying client is resolved per request inside Workers.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrismaClient();
    const value = Reflect.get(client, property);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
