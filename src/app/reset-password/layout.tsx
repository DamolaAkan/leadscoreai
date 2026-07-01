import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset password · LeadScoreAI",
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
