// Password reset token helpers (separated from route files —
// Next.js route modules may only export HTTP handlers).

import { prisma } from "@/lib/db";

async function randomBytesToHex(n: number): Promise<string> {
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(data: string): Promise<string> {
  const buf = new TextEncoder().encode(data);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = await randomBytesToHex(32);
  const tokenHash = await sha256Hex(token);
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
  const tokenHash = await sha256Hex(token);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });
  if (!record || record.expiresAt.getTime() < Date.now()) return null;
  await prisma.passwordResetToken.delete({ where: { tokenHash } });
  return record.userId;
}
