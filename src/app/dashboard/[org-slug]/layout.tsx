import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | LeadScoreAI",
  description: "Admin dashboard for managing quiz responses and analytics",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
