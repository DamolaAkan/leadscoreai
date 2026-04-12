import { Resend } from "resend";

export async function sendSequenceEmail({
  to,
  subject,
  html,
  apiKey,
  fromEmail,
  fromName,
}: {
  to: string;
  subject: string;
  html: string;
  apiKey: string;
  fromEmail: string;
  fromName: string;
}): Promise<string | null> {
  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to,
    subject,
    html,
  });
  if (error) {
    console.error("[email] Send error:", error);
    return null;
  }
  return data?.id ?? null;
}
