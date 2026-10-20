#!/usr/bin/env node
// Local-only database reset.
//
// The SQL in this folder DROPs every table. This wrapper exists so that the
// destructive step can never be reached by accident:
//
//   * it refuses to run unless the caller passes --yes-local;
//   * it refuses to run when the target looks like a shared environment;
//   * it prints what it is about to do before doing it.
//
// For any shared environment, use the version-controlled Prisma migrations:
//   npm run db:migrate

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const sqlFile = resolve(projectRoot, "scripts/local-dev/reset-local-database.sql");

const args = process.argv.slice(2);
const confirmed = args.includes("--yes-local");

if (!confirmed) {
  console.error(
    [
      "This command DROPS every table in the target database.",
      "",
      "It is only allowed against a local database. Re-run with:",
      "",
      "    npm run db:reset:local -- --yes-local",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

if (!existsSync(sqlFile)) {
  console.error(`Missing ${sqlFile}`);
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL ?? "";
if (!connectionString) {
  console.error(
    "DATABASE_URL is not set. The reset refuses to guess which database to destroy.",
  );
  process.exit(1);
}

let target;
try {
  target = new URL(connectionString);
} catch {
  console.error("DATABASE_URL is not a valid URL.");
  process.exit(1);
}

const host = target.hostname.toLowerCase();
const localHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0"]);
if (!localHosts.has(host)) {
  console.error(
    [
      "Refusing to run: the target database is not on the loopback interface.",
      `  host: ${host}`,
      "",
      "Use the version-controlled migrations for this environment instead:",
      "",
      "    npm run db:migrate",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

console.warn(
  [
    "About to DROP every table in the local database.",
    `  host: ${host}`,
    `  port: ${target.port || "5432"}`,
    `  database: ${target.pathname.replace(/^\//, "") || "(default)"}`,
    "",
  ].join("\n"),
);

const psql = spawnSync("psql", ["-v", "ON_ERROR_STOP=1", "-f", sqlFile], {
  stdio: "inherit",
  env: process.env,
});

if (psql.error) {
  console.error(
    "Could not run psql. Install the PostgreSQL client tools, or apply the SQL manually:",
    `  ${sqlFile}`,
  );
  process.exit(1);
}

if (psql.status !== 0) {
  console.error("Reset failed. The SQL file also aborts on any non-local server.");
  process.exit(psql.status ?? 1);
}

console.log("Local database reset complete.");
console.log("Run `npm run db:seed` if you want demo data back.");
