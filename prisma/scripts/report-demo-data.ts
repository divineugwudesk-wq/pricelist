// Read-only inventory of demo data.
//
// Reports the accounts created by prisma/seed.ts and the analytics events it
// fabricated, so an operator can decide what to remove. It never deletes
// anything: removing live records is a decision for the operator, not for a
// script.
//
//   npx tsx prisma/scripts/report-demo-data.ts
//
// It prints counts, roles and whether each account still has the seed
// password. Passwords and database credentials are never printed.

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { SUPABASE_ROOT_CA } from "../../lib/db-ca";

const DEMO_EMAILS = ["demo@pricelist.ng", "admin@pricelist.ng", "ada@pricelist.ng", "mama@pricelist.ng"];
const SEED_PASSWORDS = ["demo1234", "admin1234"];

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Run this from the project root so .env is loaded.");
}

const pool = new Pool({
  connectionString: connectionString
    .replace(/([?&])sslmode=[^&]*/, "$1")
    .replace(/\?&/, "?")
    .replace(/[?&]$/, ""),
  ssl: { rejectUnauthorized: true, ca: SUPABASE_ROOT_CA },
  max: 1,
});

const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log("Demo data inventory (read-only)\n");

  const users = await prisma.user.findMany({
    where: { email: { in: DEMO_EMAILS } },
    select: { id: true, email: true, role: true, suspended: true, createdAt: true, password: true },
  });

  if (users.length === 0) {
    console.log("No demo accounts found.");
  } else {
    console.log("Demo accounts:");
    for (const user of users) {
      let stillSeeded = "no";
      for (const candidate of SEED_PASSWORDS) {
        if (await bcrypt.compare(candidate, user.password)) {
          stillSeeded = "YES — this account still has a published seed password";
          break;
        }
      }
      console.log(`  ${user.email}`);
      console.log(`    role:       ${user.role}`);
      console.log(`    suspended:  ${user.suspended}`);
      console.log(`    created:    ${user.createdAt.toISOString()}`);
      console.log(`    seed password still valid: ${stillSeeded}`);
    }
  }

  const businesses = await prisma.business.findMany({
    where: { slug: { in: ["chuks-kicks", "ada-beauty", "mama-t-kitchen"] } },
    select: { slug: true, name: true },
  });
  if (businesses.length > 0) {
    console.log("\nDemo storefronts:");
    for (const business of businesses) {
      console.log(`  /${business.slug}  (${business.name})`);
    }
  }

  const seededSessionIds = await prisma.analyticsEvent.count({
    where: { sessionId: { startsWith: "seed-" } },
  });
  const totalEvents = await prisma.analyticsEvent.count();
  console.log("\nAnalytics events:");
  console.log(`  total:                    ${totalEvents}`);
  console.log(`  fabricated by the seed:   ${seededSessionIds}`);

  console.log(
    [
      "",
      "Nothing was changed. To clean up, review the list above and delete the",
      "accounts, storefronts and fabricated events you no longer want.",
      "",
    ].join("\n"),
  );
}

main()
  .catch((error) => {
    console.error("Report failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
