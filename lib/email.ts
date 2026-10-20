// Email delivery for transactional mail (password resets).
//
// Delivery uses SMTP. The transport is created per call so a failure never
// leaves a half-open connection behind, and the module is imported lazily so
// that routes which never send mail do not pull the transport into the
// bundle.
//
// Required environment:
//   SMTP_HOST   smtp host, e.g. smtp.mailtrap.io or the host your provider
//               gives you
//   SMTP_PORT   usually 587 (STARTTLS) or 465 (implicit TLS)
//   SMTP_USER   SMTP username
//   SMTP_PASS   SMTP password or app password
//   SMTP_FROM   the "from" address, e.g. "PRICELIST <no-reply@yourdomain.ng>"
//
// Optional:
//   SMTP_SECURE  set to "true" for implicit TLS on port 465
//
// Cloudflare Workers cannot open outbound connections to port 25, so the SMTP
// host must accept connections on 465 or 587.

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export type EmailResult = "sent" | "not-configured" | "failed";

/** Whether enough is configured to attempt delivery. */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth?: { user: string; pass: string };
  from: string;
}

function readConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const from = process.env.SMTP_FROM?.trim();
  if (!host || !from) return null;

  const port = Number(process.env.SMTP_PORT ?? 587) || 587;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS ?? "";
  const secure =
    process.env.SMTP_SECURE === "true" ||
    (process.env.SMTP_SECURE === undefined && port === 465);

  return {
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
    from,
  };
}

/**
 * Send one email.
 *
 * Returns a status rather than throwing, because the caller — a password
 * reset request — must answer the same way whether the address exists, and
 * must not leak the reason a delivery failed.
 */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const config = readConfig();
  if (!config) return "not-configured";

  try {
    // Imported lazily: the transport is only needed on this path, and a
    // statically imported transport would be bundled into every route.
    const nodemailer = await import("nodemailer");

    const transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });

    await transport.sendMail({
      from: config.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    return "sent";
  } catch (error) {
    // The reason is logged for the operator, but never returned to the
    // caller: a delivery failure must not become an account oracle.
    console.error(
      "[email] delivery failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return "failed";
  }
}
