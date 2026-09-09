import "server-only";

// Stubbed for the Cloudflare Workers migration: nodemailer's SMTP transport
// needs raw TCP/TLS sockets, which Workers doesn't support even with
// nodejs_compat. isEmailConfigured() returning false keeps every call site
// (src/lib/automations.ts) on its existing "skip if not configured" path.
// TODO(cloudflare-migration): wire up an HTTP email API (Resend/SendGrid/
// MailChannels) here once one is chosen, and flip isEmailConfigured() back on.

/** Whether an email provider is configured for automatic sending. */
export function isEmailConfigured(): boolean {
  return false;
}

export function fromAddress(): string {
  return (
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    "Project Management <no-reply@localhost>"
  );
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<void> {
  console.warn(
    "[email] sendEmail() is stubbed for Cloudflare Workers — no provider configured yet.",
    { to: opts.to, subject: opts.subject }
  );
}
