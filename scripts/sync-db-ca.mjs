#!/usr/bin/env node
// Keeps lib/db-ca.ts in sync with certs/prod-ca-2021.crt.
//
// Supabase serves its database certificate from a private root ("Supabase Root
// 2021 CA"). Node's default trust store does not include it, so a verified TLS
// connection has to be given that CA explicitly.
//
// The Workers runtime has no filesystem, so the certificate is baked into a
// TypeScript module that the bundler can inline. This script regenerates that
// module from the single source of truth in certs/ and runs before every build
// (see the "prebuild" script in package.json), which makes drift impossible.
//
// The certificate is public — it contains no private key — so it is safe to
// commit.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(projectRoot, "certs/prod-ca-2021.crt");
const target = resolve(projectRoot, "lib/db-ca.ts");

if (!existsSync(source)) {
  console.error(
    [
      `Missing ${source}.`,
      "",
      "Download the Supabase root CA from the Supabase dashboard",
      "(Database > Settings > SSL) and save it as certs/prod-ca-2021.crt.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

const pem = readFileSync(source, "utf8").trim();
if (!pem.includes("BEGIN CERTIFICATE")) {
  console.error(`${source} does not look like a PEM certificate.`);
  process.exit(1);
}

const contents = `// GENERATED FILE — do not edit by hand.
//
// Regenerate with: npm run ca:sync
// Source of truth: certs/prod-ca-2021.crt
//
// Supabase serves its database certificate from a private root, so a verified
// TLS connection has to be given that CA explicitly. The certificate is public
// (it contains no private key) and is committed on purpose.

export const SUPABASE_ROOT_CA = ${JSON.stringify(pem)};
`;

const existing = existsSync(target) ? readFileSync(target, "utf8") : null;
if (existing === contents) {
  console.log("lib/db-ca.ts is up to date.");
  process.exit(0);
}

writeFileSync(target, contents, "utf8");
console.log("Wrote lib/db-ca.ts from certs/prod-ca-2021.crt.");
