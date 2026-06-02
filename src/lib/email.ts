import "server-only";
import nodemailer from "nodemailer";

/** Whether SMTP credentials are configured for automatic sending. */
export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
  );
}

export function fromAddress(): string {
  return (
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    "Concertium <no-reply@concertium.local>"
  );
}

function buildTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<void> {
  if (!isEmailConfigured()) {
    throw new Error(
      "Email sending is not configured. Set SMTP_* variables in your .env to enable automatic sending."
    );
  }
  const transport = buildTransport();
  await transport.sendMail({
    from: fromAddress(),
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });
}
