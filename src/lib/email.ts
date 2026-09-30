import { Resend } from "resend";

export async function sendSequenceEmail({
  to,
  subject,
  html,
  apiKey,
  fromEmail,
  fromName,
  attachments,
  replyTo,
  cc,
}: {
  to: string | string[];
  subject: string;
  html: string;
  apiKey: string;
  fromEmail: string;
  fromName: string;
  attachments?: { filename: string; content: Buffer }[];
  replyTo?: string;
  cc?: string | string[];
}): Promise<{ id: string | null; error: string | null }> {
  // Local testing against the real database: log instead of emailing anyone.
  if (process.env.DISABLE_OUTBOUND_EMAIL === "1" && process.env.NODE_ENV !== "production") {
    console.log(`[email] (disabled) to=${Array.isArray(to) ? to.join(",") : to} subject=${subject}`);
    return { id: null, error: null };
  }
  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to,
    subject,
    html,
    attachments,
    replyTo,
    cc,
  });
  if (error) {
    console.error("[email] Send error:", error);
    return { id: null, error: `${error.name}: ${error.message}` };
  }
  return { id: data?.id ?? null, error: null };
}
