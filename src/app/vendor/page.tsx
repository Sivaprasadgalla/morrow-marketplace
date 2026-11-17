import { VendorRevenue } from "@/components/dashboard/vendor-revenue";
import { verifyPageRole } from "@/lib/dal";

export default async function VendorOverview() {
  await verifyPageRole(["vendor"]);
  return <VendorRevenue analytics />;
}
