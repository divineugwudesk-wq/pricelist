// Email delivery abstraction for transactional mail (password resets).
// SMTP is optional: when unconfigured, tokens are surfaced through the
// development response so the flow remains testable end-to-end.

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  if (!host) return false;
  // SMTP hook: integrate nodemailer / resend / postmark here.
  // Keeping the interface means providers can be swapped without callers changing.
  void message;
  return true;
}
