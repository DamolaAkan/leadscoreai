import { Resend } from "resend";

export async function sendSequenceEmail({
  to,
  subject,
  html,
  apiKey,
  fromEmail,
  fromName,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  apiKey: string;
  fromEmail: string;
  fromName: string;
  attachments?: { filename: string; content: Buffer }[];
}): Promise<{ id: string | null; error: string | null }> {
  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to,
    subject,
    html,
    attachments,
  });
  if (error) {
    console.error("[email] Send error:", error);
    return { id: null, error: `${error.name}: ${error.message}` };
  }
  return { id: data?.id ?? null, error: null };
}
