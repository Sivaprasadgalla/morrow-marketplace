import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { verifyPageRole } from "@/lib/dal";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const session = await verifyPageRole(["vendor"]);
  let storeName: string | undefined;
  if (session.user.id) {
    try {
      await connectDB();
      const vendor = await User.findById(session.user.id).select("vendorProfile.storeName").lean();
      storeName = vendor?.vendorProfile?.storeName;
    } catch {
      /* fallback to default */
    }
  }
  return (
    <DashboardShell
      role="vendor"
      storeName={storeName}
      user={{ name: session.user.name ?? "Vendor", email: session.user.email ?? "" }}
    >
      {children}
    </DashboardShell>
  );
}
