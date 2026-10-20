// Prisma client wiring.
//
// Three Cloudflare Workers constraints shape this file:
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
//
// 3. The database is reached through Cloudflare Hyperdrive. Hyperdrive
//    terminates the certificate of the origin database on Cloudflare's side
//    and exposes the connection to the Worker as a plaintext Postgres
//    endpoint inside Cloudflare's own network. The Workers runtime does not
//    trust the private root that Supabase serves its certificate from
//    ("Supabase Root 2021 CA"), so a direct connection is not possible
//    without turning certificate verification off — which is not done here.
//    The Hyperdrive binding is therefore required in Workers, and the
//    connection to it is plaintext. Outside Workers the connection goes
//    straight to Supabase and is verified against the Supabase root CA that
//    ships with this repository.
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import type { PoolConfig } from "pg";
import { after } from "next/server";
import { SUPABASE_ROOT_CA } from "@/lib/db-ca";
import { getWorkerContext, getWorkerEnv, isWorkersRuntime } from "@/lib/worker-env";

interface RequestScope {
  ctx?: { waitUntil?: (promise: Promise<unknown>) => void };
  env?: {
    HYPERDRIVE?: HyperdriveBinding;
  };
  prismaClient?: PrismaClient;
  prismaPool?: Pool;
}

const globalForPrisma = globalThis as unknown as {
  prismaClient?: PrismaClient;
  prismaPool?: Pool;
};

/** How the current process reaches Postgres. */
export type DatabaseConnectionMode = "hyperdrive" | "direct";

/** The Cloudflare Hyperdrive binding, as the runtime exposes it. */
export interface HyperdriveBinding {
  connectionString?: string;
  host?: string;
  port?: number | string;
  user?: string;
  password?: string;
  database?: string;
}

/**
 * The parts of a connection, split out.
 *
 * The binding exposes them separately, and they are preferred over the
 * connection string: the runtime writes the password into the URL without
 * percent-encoding it, so a password containing "#" truncates the authority
 * and the URL no longer describes the database.
 */
export interface DatabaseConnectionParts {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface DatabaseConnection {
  connectionString: string;
  mode: DatabaseConnectionMode;
  /** Where the connection string came from. Never contains a credential. */
  source: "HYPERDRIVE binding" | "DATABASE_URL";
  /** The connection split into parts, when the binding provides them. */
  parts?: DatabaseConnectionParts;
}

/** Raised when the database connection is not configured for this runtime. */
export class DatabaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseConfigurationError";
  }
}

export { isWorkersRuntime };

/** The OpenNext request store, or undefined outside a Workers request. */
function currentRequestScope(): RequestScope | undefined {
  const store = getWorkerContext();
  return store && typeof store === "object" ? (store as RequestScope) : undefined;
}

/**
 * Remove the `sslmode` parameter from a connection string.
 *
 * `pg` merges the parsed connection string *over* the options passed to the
 * pool (`Object.assign({}, config, parse(connectionString))`), so a
 * `sslmode=no-verify` in the URL silently wins over an explicit `ssl` option
 * and turns certificate verification off. Stripping it here means the
 * verification settings below are the only thing that decides the TLS
 * behaviour.
 */
export function stripSslMode(connectionString: string): string {
  return connectionString
    .replace(/([?&])sslmode=[^&]*/, "$1")
    .replace(/\?&/, "?")
    .replace(/[?&]$/, "");
}

/**
 * TLS settings for the pool.
 *
 * - `hyperdrive` — the Worker talks to the Hyperdrive endpoint inside
 *   Cloudflare's network. That endpoint speaks plaintext Postgres; the
 *   certificate of the origin database is terminated by Hyperdrive, not by
 *   the Worker. The Workers runtime rejects a TLS handshake here
 *   ("The server does not support SSL connections"), so no TLS is attempted.
 * - `direct` — a Node process (local development, scripts) connects straight
 *   to Supabase, whose certificate chains to the private "Supabase Root 2021
 *   CA". That CA is added to the trust store, so the certificate is verified
 *   rather than accepted blindly.
 */
export function buildSslOptions(mode: DatabaseConnectionMode): PoolConfig["ssl"] {
  if (mode === "hyperdrive") {
    return false;
  }
  return { rejectUnauthorized: true, ca: SUPABASE_ROOT_CA };
}

export function buildPoolConfig(
  connectionString: string,
  mode: DatabaseConnectionMode,
  options: {
    /** The connection split into parts; used instead of the URL when present. */
    parts?: DatabaseConnectionParts;
  } = {},
): PoolConfig {
  const target: PoolConfig = options.parts
    ? {
        host: options.parts.host,
        port: options.parts.port,
        user: options.parts.user,
        password: options.parts.password,
        database: options.parts.database,
      }
    : { connectionString: stripSslMode(connectionString) };

  return {
    ...target,
    ssl: buildSslOptions(mode),
    // Workers forbids sharing a TCP socket between requests, so each request
    // gets its own single-connection pool.
    max: 1,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
  };
}

/** The connection parts of a Hyperdrive binding, when it exposes all of them. */
export function toConnectionParts(
  binding: HyperdriveBinding,
): DatabaseConnectionParts | undefined {
  const { host, user, password, database } = binding;
  if (!host || !user || password === undefined || !database) {
    return undefined;
  }

  const port = Number(binding.port ?? 5432);
  if (!Number.isFinite(port) || port <= 0) {
    return undefined;
  }

  return { host, port, user, password, database };
}

/**
 * Where the Worker should connect to Postgres.
 *
 * Inside Workers the Hyperdrive binding is mandatory. Falling back to a direct
 * connection there could only work by disabling certificate verification, so
 * instead the process fails loudly with instructions.
 *
 * Outside Workers (scripts, the Node dev server) there is no binding and the
 * connection string comes from the environment.
 */
export function resolveConnection(
  scope: RequestScope | undefined,
  env: NodeJS.ProcessEnv = process.env,
): DatabaseConnection {
  const binding = scope?.env?.HYPERDRIVE;
  if (binding) {
    // The separately exposed fields are preferred over the connection string.
    // The runtime writes the password into that URL without percent-encoding
    // it, so a password containing "#" cuts the authority short and the URL no
    // longer describes the database. The fields carry the password verbatim.
    return {
      connectionString: binding.connectionString ?? "",
      mode: "hyperdrive",
      source: "HYPERDRIVE binding",
      parts: toConnectionParts(binding),
    };
  }

  if (isWorkersRuntime()) {
    throw new DatabaseConfigurationError(
      [
        "No HYPERDRIVE binding is configured for this Worker, so the database cannot be reached.",
        "",
        "The Workers runtime only trusts publicly signed certificates, and Supabase",
        "serves its certificate from a private root, so a direct connection would",
        "require turning certificate verification off. That is not done here.",
        "",
        "Set the binding up once with:",
        "",
        "    node scripts/setup-hyperdrive.mjs",
        "",
        "which uploads certs/prod-ca-2021.crt, creates the Hyperdrive configuration",
        "and writes the [[hyperdrive]] block into wrangler.toml.",
      ].join("\n"),
    );
  }

  const direct = env.DATABASE_URL;
  if (!direct) {
    throw new DatabaseConfigurationError(
      "DATABASE_URL is not set. Add it to .env for local development, or to the Worker runtime variables.",
    );
  }
  return {
    connectionString: direct,
    mode: "direct",
    source: "DATABASE_URL",
  };
}

function createClient(
  scope: RequestScope | undefined,
): { client: PrismaClient; pool: Pool } {
  const connection = resolveConnection(scope);
  const pool = new Pool(
    buildPoolConfig(connection.connectionString, connection.mode, {
      parts: connection.parts,
    }),
  );
  // A socket that the runtime tears down at the end of a request surfaces as an
  // 'error' event on the pool. Without a listener that would become an
  // unhandled error and take the Worker down.
  pool.on("error", () => {});

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

/**
 * True while the pool has a query in flight.
 *
 * `pool.end()` marks the pool as ended, and the next `pool.connect()` then
 * fails with "Cannot use a pool after calling end on the pool". A pool that
 * is busy must therefore not be closed.
 */
function isBusy(pool: Pool): boolean {
  return pool.totalCount > pool.idleCount;
}

/**
 * Pools that could not be closed when their request finished.
 *
 * They are closed by the next request handled by this isolate, but only once
 * they are idle: a request that is still running may be about to use its pool
 * again.
 */
const deferredCleanups: Array<() => Promise<void>> = [];

function flushDeferredCleanups(): void {
  if (deferredCleanups.length === 0) return;

  const pending = deferredCleanups.splice(0, deferredCleanups.length);
  for (const cleanup of pending) {
    void cleanup();
  }
}

/**
 * Release the request-scoped client once the response has been produced.
 *
 * Closing the pool any earlier would abort queries that are still in flight:
 * `pool.end()` marks the pool as ended, and the next `pool.connect()` then
 * fails with "Cannot use a pool after calling end on the pool".
 */
function scheduleCleanup(client: PrismaClient, pool: Pool): void {
  const cleanup = async () => {
    // A query may still be running, for instance when the request handed
    // work to a background task. Closing the pool then would break that
    // work, so the pool is left for a later attempt.
    if (isBusy(pool)) {
      if (!deferredCleanups.includes(cleanup)) {
        deferredCleanups.push(cleanup);
      }
      return;
    }

    const index = deferredCleanups.indexOf(cleanup);
    if (index !== -1) {
      deferredCleanups.splice(index, 1);
    }
    await closeClient(client, pool);
  };

  // Backstop: if `after()` never runs, the next request handled by this
  // isolate closes the pool.
  deferredCleanups.push(cleanup);

  // `after()` runs the callback once the response has been produced, which is
  // exactly when the request's database work is over.
  try {
    after(async () => {
      await cleanup();
    });
  } catch {
    // `after()` is unavailable outside a Next.js request scope (build-time
    // prerendering, scripts).
  }
}

/** The client for the current request (or the process-wide one outside Workers). */
export function getPrismaClient(): PrismaClient {
  const scope = currentRequestScope();

  if (!scope) {
    if (!globalForPrisma.prismaClient) {
      const { client, pool } = createClient(scope);
      globalForPrisma.prismaClient = client;
      globalForPrisma.prismaPool = pool;
    }
    return globalForPrisma.prismaClient;
  }

  if (!scope.prismaClient) {
    // Pools left over from earlier requests can be closed now: those requests
    // have finished by definition.
    flushDeferredCleanups();

    const { client, pool } = createClient(scope);
    scope.prismaClient = client;
    scope.prismaPool = pool;
    scheduleCleanup(client, pool);
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
