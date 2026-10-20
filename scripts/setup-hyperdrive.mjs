#!/usr/bin/env node
// One-shot Cloudflare setup for the Pricelist Worker.
//
// The Workers runtime only trusts publicly signed TLS certificates, and
// Supabase serves a chain issued by its own "Supabase Root 2021 CA". A Worker
// therefore cannot open a TLS connection to Supabase directly. Cloudflare
// Hyperdrive bridges that gap: it terminates the Supabase certificate on
// Cloudflare's side and hands the Worker a connection the runtime can verify.
//
// Prerequisites (run once, in this directory):
//   npx wrangler login
//
// Then:
//   node scripts/setup-hyperdrive.mjs
//
// The script is idempotent: existing CA certificates and Hyperdrive configs
// are reused instead of being duplicated.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const wranglerBin = resolve(projectRoot, "node_modules/wrangler/bin/wrangler.js");

const CA_NAME = "supabase-ca";
const HYPERDRIVE_NAME = "pricelist-db";
const CA_FILE = resolve(projectRoot, "certs/prod-ca-2021.crt");
const WRANGLER_TOML = resolve(projectRoot, "wrangler.toml");

function wrangler(args, input) {
  try {
    return execFileSync(process.execPath, [wranglerBin, ...args], {
      encoding: "utf8",
      input,
      stdio: ["pipe", "pipe", "pipe"],
      cwd: projectRoot,
    });
  } catch (error) {
    const detail = [error.stdout, error.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`wrangler ${args.join(" ")} failed\n${detail || error.message}`);
  }
}

function readEnvFile(path) {
  if (!existsSync(path)) return {};
  const values = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (!match) continue;
    values[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
  return values;
}

/**
 * wrangler prints a table of resources, and the id sits in the first column.
 *
 * The id is not always a dashed UUID — a Hyperdrive id is 32 hex characters
 * without dashes — so the first cell of the matching row is read instead of
 * matching a UUID shape.
 */
function findIdForName(output, name, label) {
  const row = output
    .split(/\r?\n/)
    .find((line) => line.includes(name) && line.includes("│"));
  if (row) {
    const cell = row.match(/│\s*([0-9a-zA-Z-]{8,})\s*│/);
    if (cell) return cell[1];
  }
  throw new Error(
    `Could not find the ${label} id in wrangler's output.\n--- output ---\n${output}\n--- end output ---`,
  );
}

/**
 * `wrangler cert list` prints one "ID: / Name: / Issuer: ..." block per
 * certificate, so the id is read from the block that carries the name.
 */
function findCaIdForName(output, name) {
  for (const block of output.split(/\r?\n\s*\r?\n/)) {
    if (!block.includes(`Name: ${name}`)) continue;
    const id = block.match(/ID:\s*([0-9a-fA-F-]{8,})/);
    if (id) return id[1];
  }
  throw new Error(
    `Could not find the CA certificate id in wrangler's output.\n--- output ---\n${output}\n--- end output ---`,
  );
}

function requireAuth() {
  if (process.env.CLOUDFLARE_API_TOKEN) {
    console.log("Using CLOUDFLARE_API_TOKEN from the environment.");
    return;
  }

  const whoami = wrangler(["whoami"]);
  if (/not authenticated/i.test(whoami)) {
    console.error(
      [
        "Not authenticated with Cloudflare.",
        "",
        "Run this in the project directory, then re-run the script:",
        "",
        "    npx wrangler login",
        "",
        "It opens a browser so you can approve the login.",
        "",
        "Alternatively set CLOUDFLARE_API_TOKEN with the permissions",
        "Workers Scripts:Edit, Hyperdrive:Edit and SSL Certificates:Edit.",
      ].join("\n"),
    );
    process.exit(1);
  }
  console.log(`Authenticated as: ${whoami.trim().split("\n").pop()}`);
}

function uploadCaCertificate() {
  const existing = wrangler(["cert", "list"]);
  if (existing.includes(`Name: ${CA_NAME}`)) {
    console.log(`CA certificate "${CA_NAME}" already exists, reusing it.`);
    return findCaIdForName(existing, CA_NAME);
  }

  if (!existsSync(CA_FILE)) {
    throw new Error(`Missing ${CA_FILE}. Download the Supabase CA certificate first.`);
  }

  console.log(`Uploading CA certificate "${CA_NAME}"...`);
  const output = wrangler([
    "cert",
    "upload",
    "certificate-authority",
    "--ca-cert",
    CA_FILE,
    "--name",
    CA_NAME,
  ]);
  console.log(output.trim());

  const listed = wrangler(["cert", "list"]);
  if (!listed.includes(`Name: ${CA_NAME}`)) {
    throw new Error(
      `CA uploaded but "${CA_NAME}" not found in wrangler cert list.\n${listed}`,
    );
  }
  return findCaIdForName(listed, CA_NAME);
}

function createHyperdrive(connectionString, caCertificateId) {
  const listed = wrangler(["hyperdrive", "list"]);
  const existingLine = listed
    .split(/\r?\n/)
    .find((line) => line.includes(HYPERDRIVE_NAME));
  if (existingLine) {
    console.log(`Hyperdrive config "${HYPERDRIVE_NAME}" already exists, reusing it.`);
    return findIdForName(listed, HYPERDRIVE_NAME, "Hyperdrive");
  }

  console.log(`Creating Hyperdrive config "${HYPERDRIVE_NAME}"...`);
  const output = wrangler([
    "hyperdrive",
    "create",
    HYPERDRIVE_NAME,
    "--connection-string",
    connectionString,
    "--ca-certificate-id",
    caCertificateId,
    "--sslmode",
    "verify-full",
    // The catalogue, stock counts and order totals must never be served from
    // a cache, so query caching stays off.
    "--caching-disabled",
  ]);
  console.log(output.trim());

  const after = wrangler(["hyperdrive", "list"]);
  if (!after.includes(HYPERDRIVE_NAME)) {
    throw new Error(
      `Hyperdrive created but "${HYPERDRIVE_NAME}" not found in wrangler hyperdrive list.\n${after}`,
    );
  }
  return findIdForName(after, HYPERDRIVE_NAME, "Hyperdrive");
}

function writeHyperdriveBinding(hyperdriveId, localConnectionString) {
  let toml = readFileSync(WRANGLER_TOML, "utf8");

  const block = [
    "[[hyperdrive]]",
    'binding = "HYPERDRIVE"',
    `id = "${hyperdriveId}"`,
    `localConnectionString = "${localConnectionString}"`,
  ].join("\n");

  // Drop any previously written block, then append the current one.
  toml = toml.replace(/\[\[hyperdrive\]\]\n(?:[^\[]*\n)*/g, "");
  toml = toml.replace(/\n+$/, "\n");
  toml = `${toml}\n${block}\n`;

  writeFileSync(WRANGLER_TOML, toml, "utf8");
  console.log(`Wrote [[hyperdrive]] binding to wrangler.toml (id ${hyperdriveId}).`);
}

function setSecret(name, value) {
  console.log(`Setting secret ${name} on the Worker...`);
  const output = wrangler(["secret", "put", name], `${value}\n`);
  console.log(output.trim());
}

requireAuth();

const env = { ...readEnvFile(resolve(projectRoot, ".env")), ...readEnvFile(resolve(projectRoot, ".dev.vars")) };

if (!env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in .env or .dev.vars.");
}
if (!env.AUTH_SECRET) {
  throw new Error("AUTH_SECRET is not set in .env or .dev.vars.");
}

// Hyperdrive takes the origin details separately from the TLS mode, so the
// connection string is stripped of its query parameters.
//
// `URL.username` and `URL.password` return the percent-encoded form, which is
// what has to be written back: a password that contains "#" would otherwise
// end the authority and the connection string would no longer describe the
// database.
const origin = new URL(env.DATABASE_URL);
const originConnectionString = `postgresql://${origin.username}:${origin.password}@${origin.host}${origin.pathname}`;

// In local development wrangler runs a proxy in front of the database. That
// proxy terminates TLS towards the origin, and it is pointed at the Supabase
// root certificate that ships with this project, so the local connection is
// verified as well. The certificate path stays readable, so it is appended
// as it is instead of being run through the URL encoder.
const localConnectionString =
  `postgresql://${origin.username}:${origin.password}@${origin.host}${origin.pathname}` +
  "?sslmode=verify-full&sslrootcert=certs/prod-ca-2021.crt";

const caCertificateId = uploadCaCertificate();
console.log(`CA certificate id: ${caCertificateId}`);

const hyperdriveId = createHyperdrive(originConnectionString, caCertificateId);
console.log(`Hyperdrive id: ${hyperdriveId}`);

writeHyperdriveBinding(hyperdriveId, localConnectionString);

setSecret("DATABASE_URL", env.DATABASE_URL);
setSecret("AUTH_SECRET", env.AUTH_SECRET);

console.log("");
console.log("Setup complete. Next: npm run build, then wrangler deploy.");
