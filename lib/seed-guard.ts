// Guards for the demo seed script.
//
// The demo dataset creates accounts with a known password and can fabricate
// thousands of analytics events. It is fine on a throwaway local database and
// harmful anywhere else, so the rules live here where they can be tested
// without touching a database.

export interface SeedEnvironment {
  mode?: string;
  nodeEnv?: string;
  allowRemote?: string;
  /** The host of the target database, or "" when it cannot be determined. */
  host: string;
}

/** Whether the host looks like a local development database. */
export function isLocalHost(host: string): boolean {
  const normalised = host.trim().toLowerCase();
  return (
    normalised === "" ||
    normalised === "localhost" ||
    normalised === "127.0.0.1" ||
    normalised === "::1" ||
    normalised === "[::1]" ||
    normalised.endsWith(".local")
  );
}

export class SeedNotAllowedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SeedNotAllowedError";
  }
}

/**
 * Check that the demo seed is allowed to run.
 *
 * Throws a `SeedNotAllowedError` with instructions when it is not.
 */
export function assertDemoSeedAllowed(env: SeedEnvironment): void {
  if (env.mode !== "demo") {
    throw new SeedNotAllowedError(
      [
        "Refusing to seed: the demo dataset is opt-in.",
        "",
        "It creates accounts with a known password and can fabricate thousands of",
        "analytics events, so it must never run against a database holding real",
        "data. To run it against a local database:",
        "",
        "    PRICELIST_SEED_MODE=demo npm run db:seed",
        "",
        "To create the same demo dataset on a shared database, add:",
        "",
        "    PRICELIST_SEED_ALLOW_REMOTE=true",
        "",
      ].join("\n"),
    );
  }

  if (env.nodeEnv === "production") {
    throw new SeedNotAllowedError(
      "Refusing to seed: NODE_ENV is 'production'. The demo dataset has no place in a production database.",
    );
  }

  if (!isLocalHost(env.host) && env.allowRemote !== "true") {
    throw new SeedNotAllowedError(
      [
        `Refusing to seed: the target database (${env.host}) is not a local database.`,
        "",
        "The demo dataset creates accounts with a published password and fabricates",
        "analytics events. If this really is a disposable database, add:",
        "",
        "    PRICELIST_SEED_ALLOW_REMOTE=true",
        "",
      ].join("\n"),
    );
  }
}

/**
 * The password the demo accounts are created with.
 *
 * Generated randomly unless the operator supplies one, so the credential is
 * never published in the repository.
 */
export function resolveDemoPassword(
  provided: string | undefined,
  random: () => string,
): string {
  if (provided) {
    if (provided.length < 12) {
      throw new Error("PRICELIST_SEED_PASSWORD must be at least 12 characters.");
    }
    return provided;
  }
  return random();
}
