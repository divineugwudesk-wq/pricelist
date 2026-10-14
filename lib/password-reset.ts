// Password reset token helpers (separated from route files —
// Next.js route modules may only export HTTP handlers).

import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/db";

export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  await prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt },
  });
  return token;
}

export async function consumePasswordResetToken(
  token: string,
): Promise<string | null> {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });
  if (!record || record.expiresAt.getTime() < Date.now()) return null;
  await prisma.passwordResetToken.delete({ where: { tokenHash } });
  return record.userId;
}
