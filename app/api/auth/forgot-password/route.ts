import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { createPasswordResetToken } from "@/lib/password-reset";
import { enforceRateLimit } from "@/lib/rate-limit";
import { absoluteUrl } from "@/lib/app-url";

export const dynamic = "force-dynamic";

/**
 * Request a password reset.
 *
 * The answer is the same whether or not the address has an account, and
 * whether or not the email could be delivered. Anything else turns this
 * endpoint into a way of discovering which addresses are registered, and of
 * probing the mail provider.
 *
 * The development shortcut that used to return the reset link in the
 * response is now behind an explicit opt-in that cannot be on in production.
 */
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

    const limited = await enforceRateLimit(request, "auth", email);
    if (limited) return limited;

    const user = await prisma.user.findUnique({ where: { email } });
    if (user && !user.suspended) {
      const token = await createPasswordResetToken(user.id);
      const resetUrl = absoluteUrl(`/reset-password?token=${encodeURIComponent(token)}`);
      const result = await sendEmail({
        to: user.email,
        subject: "Reset your PRICELIST password",
        text: [
          "Use this link to reset your password (valid for 1 hour):",
          "",
          resetUrl,
          "",
          "If you did not ask for this, you can ignore this email — your",
          "password has not changed.",
        ].join("\n"),
      });

      // The reset link is surfaced directly only when the operator has
      // explicitly asked for it, and never in production. Without it the
      // response is identical for every address.
      if (
        result !== "sent" &&
        process.env.PRICELIST_DEV_RESET_LINK === "true" &&
        process.env.NODE_ENV !== "production"
      ) {
        return Response.json({ ok: true, devResetUrl: resetUrl });
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("[forgot-password]", error);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
