import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { verifyPageRole } from "@/lib/dal";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await verifyPageRole(["admin"]);
  return <DashboardShell role="admin" user={{ name: session.user.name ?? "Administrator", email: session.user.email ?? "" }}>{children}</DashboardShell>;
}
