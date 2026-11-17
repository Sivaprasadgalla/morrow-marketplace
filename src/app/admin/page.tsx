import { AdminReports } from "@/components/dashboard/admin-reports";
import { verifyPageRole } from "@/lib/dal";

export default async function AdminOverview() {
  await verifyPageRole(["admin"]);
  return <AdminReports />;
}
