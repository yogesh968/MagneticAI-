import { appUrl } from "../config/env.js";

interface DunningInfo {
  tenantName?: string;
  status: string;
  gracePeriodEnds: Date;
}

/**
 * Warns a tenant that their subscription lapsed and they are now in the grace
 * window. Uses SMTP when configured (the same vars as the password-reset email in
 * auth.controller); otherwise it LOGS rather than silently pretending to send —
 * dunning that quietly no-ops is worse than none.
 */
export async function sendDunningEmail(to: string, info: DunningInfo) {
  const ends = info.gracePeriodEnds.toDateString();
  const billingLink = `${appUrl}/dashboard/billing`;
  const subject = "Action needed: your Astrex.ai subscription";
  const html = `<p>Hi${info.tenantName ? " " + info.tenantName : ""},</p>
    <p>We couldn't renew your Astrex.ai subscription, so your account is now <strong>${info.status.replace("_", " ")}</strong>.</p>
    <p>Your assistant will keep serving your customers until <strong>${ends}</strong>. Please update your payment method before then to avoid any interruption.</p>
    <p><a href="${billingLink}">Manage billing</a></p>`;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const nodemailer = await import("nodemailer");
      const transport = nodemailer.default.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transport.sendMail({ from: process.env.SMTP_FROM ?? process.env.SMTP_USER, to, subject, html });
    } catch (err) {
      console.error("[dunning] failed to send email:", (err as Error).message);
    }
  } else {
    console.info(`\n[dunning] Would email ${to}: "${subject}" (grace ends ${ends}). Set SMTP_HOST/SMTP_USER/SMTP_PASS to send real emails.\n`);
  }
}
