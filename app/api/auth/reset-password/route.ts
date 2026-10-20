import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { consumePasswordResetToken } from "@/lib/password-reset";
import { enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string; password?: string };
    const token = String(body.token ?? "");
    const password = String(body.password ?? "");

    const limited = await enforceRateLimit(request, "auth");
    if (limited) return limited;

    if (!token) {
      return Response.json({ error: "Invalid reset link." }, { status: 400 });
    }
    if (password.length < 8) {
      return Response.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }
    const userId = await consumePasswordResetToken(token);
    if (!userId) {
      return Response.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 },
      );
    }
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: await hashPassword(password),
        // Ending every existing session for this account: the session cookie
        // is a JWT and would otherwise stay valid until it expires.
        sessionVersion: { increment: 1 },
      },
    });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[reset-password]", error);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
