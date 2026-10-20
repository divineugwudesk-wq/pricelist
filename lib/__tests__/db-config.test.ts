import { describe, it, expect, afterEach } from "vitest";
import {
  buildPoolConfig,
  buildSslOptions,
  resolveConnection,
  stripSslMode,
  toConnectionParts,
  DatabaseConfigurationError,
} from "@/lib/db";

const ORIGINAL_NAVIGATOR = globalThis.navigator;

function makeEnv(overrides: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv {
  return { NODE_ENV: "test", ...overrides };
}

afterEach(() => {
  if (ORIGINAL_NAVIGATOR === undefined) {
    // Leave the environment as it was found.
    Reflect.deleteProperty(globalThis, "navigator");
  } else {
    Object.defineProperty(globalThis, "navigator", {
      value: ORIGINAL_NAVIGATOR,
      configurable: true,
      writable: true,
    });
  }
});

function pretendToBeWorkers(): void {
  Object.defineProperty(globalThis, "navigator", {
    value: { userAgent: "Cloudflare-Workers" },
    configurable: true,
    writable: true,
  });
}

describe("connection string handling", () => {
  it("removes sslmode so it cannot override the verification settings", () => {
    expect(
      stripSslMode("postgresql://u:p@host:5432/db?sslmode=no-verify"),
    ).toBe("postgresql://u:p@host:5432/db");
  });

  it("removes sslmode from the middle of the query string", () => {
    expect(
      stripSslMode("postgresql://u:p@host:5432/db?sslmode=no-verify&x=1"),
    ).toBe("postgresql://u:p@host:5432/db?&x=1".replace("?&", "?"));
  });

  it("leaves a connection string without sslmode alone", () => {
    expect(stripSslMode("postgresql://u:p@host:5432/db")).toBe(
      "postgresql://u:p@host:5432/db",
    );
  });
});

describe("TLS settings", () => {
  it("talks plaintext to the Hyperdrive endpoint, which does not do TLS", () => {
    expect(buildSslOptions("hyperdrive")).toBe(false);
  });

  it("verifies direct connections and trusts the Supabase root CA", () => {
    const ssl = buildSslOptions("direct") as {
      rejectUnauthorized: boolean;
      ca?: string;
    };
    expect(ssl.rejectUnauthorized).toBe(true);
    expect(ssl.ca).toContain("BEGIN CERTIFICATE");
  });
});

describe("pool configuration", () => {
  it("keeps the sslmode out of the URL", () => {
    const config = buildPoolConfig(
      "postgresql://u:p@host:5432/db?sslmode=no-verify",
      "direct",
    );
    expect(config.connectionString).not.toContain("sslmode");
    expect((config.ssl as { rejectUnauthorized: boolean }).rejectUnauthorized).toBe(
      true,
    );
  });

  it("connects with the parts when the binding provides them", () => {
    const config = buildPoolConfig(
      "postgresql://u:p@host:5432/db",
      "hyperdrive",
      {
        parts: {
          host: "edge.hyperdrive.local",
          port: 5432,
          user: "u",
          password: "p#ss",
          database: "db",
        },
      },
    );
    expect(config.connectionString).toBeUndefined();
    expect(config.host).toBe("edge.hyperdrive.local");
    expect(config.port).toBe(5432);
    expect(config.user).toBe("u");
    expect(config.password).toBe("p#ss");
    expect(config.database).toBe("db");
  });
});

describe("connection parts", () => {
  it("returns nothing when the binding does not expose all of them", () => {
    expect(toConnectionParts({ host: "edge", user: "u" })).toBeUndefined();
  });

  it("defaults the port to 5432", () => {
    const parts = toConnectionParts({
      host: "edge",
      user: "u",
      password: "p",
      database: "db",
    });
    expect(parts?.port).toBe(5432);
  });
});

describe("connection resolution", () => {
  it("prefers the Hyperdrive binding when it exists", () => {
    const connection = resolveConnection(
      { env: { HYPERDRIVE: { connectionString: "postgresql://h/d" } } },
      makeEnv({ DATABASE_URL: "postgresql://d/d" }),
    );
    expect(connection.mode).toBe("hyperdrive");
    expect(connection.source).toBe("HYPERDRIVE binding");
    expect(connection.connectionString).toBe("postgresql://h/d");
  });

  it("prefers the parts over a connection string with an unencoded password", () => {
    const connection = resolveConnection({
      env: {
        HYPERDRIVE: {
          connectionString:
            "postgresql://token:p#ss@edge.hyperdrive.local:5432/db?sslmode=disable",
          host: "edge.hyperdrive.local",
          port: 5432,
          user: "token",
          password: "p#ss",
          database: "db",
        },
      },
    });
    expect(connection.parts).toEqual({
      host: "edge.hyperdrive.local",
      port: 5432,
      user: "token",
      password: "p#ss",
      database: "db",
    });
  });

  it("uses DATABASE_URL outside the Workers runtime", () => {
    const connection = resolveConnection(undefined, makeEnv({ DATABASE_URL: "postgresql://d/d" }));
    expect(connection.mode).toBe("direct");
    expect(connection.source).toBe("DATABASE_URL");
  });

  it("fails loudly in the Workers runtime when no binding is configured", () => {
    pretendToBeWorkers();
    expect(() =>
      resolveConnection({ env: {} }, makeEnv({ DATABASE_URL: "postgresql://d/d" })),
    ).toThrow(DatabaseConfigurationError);
  });

  it("does not fall back to a direct connection in the Workers runtime", () => {
    pretendToBeWorkers();
    let message = "";
    try {
      resolveConnection({ env: {} }, makeEnv({ DATABASE_URL: "postgresql://d/d" }));
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("HYPERDRIVE");
    expect(message).not.toContain("postgresql://");
  });

  it("explains how to set the binding up", () => {
    pretendToBeWorkers();
    let message = "";
    try {
      resolveConnection({ env: {} }, makeEnv());
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("setup-hyperdrive.mjs");
  });

  it("fails when DATABASE_URL is missing outside the Workers runtime", () => {
    expect(() => resolveConnection(undefined, makeEnv())).toThrow(
      DatabaseConfigurationError,
    );
  });
});
