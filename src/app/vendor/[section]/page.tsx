import { notFound } from "next/navigation";
import { VendorOrders } from "@/components/dashboard/vendor-orders";
import { VendorProductManager } from "@/components/dashboard/vendor-product-manager";
import { VendorRevenue } from "@/components/dashboard/vendor-revenue";
import { VendorSettings } from "@/components/dashboard/vendor-settings";
import { verifyPageRole } from "@/lib/dal";

const validSections = ["products", "orders", "inventory", "earnings", "analytics", "settings"];

export default async function VendorSection({ params }: { params: Promise<{ section: string }> }) {
  await verifyPageRole(["vendor"]);
  const { section } = await params;
  if (!validSections.includes(section)) notFound();
  if (section === "products") return <VendorProductManager />;
  if (section === "inventory") return <VendorProductManager inventoryOnly />;
  if (section === "orders") return <VendorOrders />;
  if (section === "settings") return <VendorSettings />;
  return <VendorRevenue analytics={section === "analytics"} />;
}
