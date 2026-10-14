import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { createPasswordResetToken } from "@/lib/password-reset";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json(
        { error: "Enter a valid email address." },
        { status: 400 },
      );
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && !user.suspended) {
      const token = await createPasswordResetToken(user.id);
      const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}`;
      const sent = await sendEmail({
        to: user.email,
        subject: "Reset your PRICELIST password",
        text: `Use this link to reset your password (valid for 1 hour): ${resetUrl}`,
      });
      // Development fallback: surface the reset link directly when no
      // email provider is configured, so the flow stays testable.
      return Response.json({ ok: true, devResetUrl: sent ? undefined : resetUrl });
    }
    // Don't reveal whether the email exists.
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[forgot-password]", error);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
