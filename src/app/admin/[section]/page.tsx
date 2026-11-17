import { notFound } from "next/navigation";
import { AdminOrders } from "@/components/dashboard/admin-orders";
import { AdminReports } from "@/components/dashboard/admin-reports";
import { ProductModeration } from "@/components/dashboard/product-moderation";
import { UserManagement } from "@/components/dashboard/user-management";
import { verifyPageRole } from "@/lib/dal";

const validSections = ["users", "vendors", "products", "orders", "customers", "moderation", "reports", "settings"];

export default async function AdminSection({ params }: { params: Promise<{ section: string }> }) {
  await verifyPageRole(["admin"]);
  const { section } = await params;
  if (!validSections.includes(section)) notFound();
  if (section === "users") return <UserManagement initialRole="all" />;
  if (section === "vendors") return <UserManagement initialRole="vendor" />;
  if (section === "customers") return <UserManagement initialRole="customer" />;
  if (section === "orders") return <AdminOrders />;
  if (section === "products" || section === "moderation") return <ProductModeration mode={section === "moderation" ? "moderation" : "catalogue"} />;
  if (section === "reports") return <AdminReports />;
  return <Settings />;
}

function Settings() {
  return <div className="mx-auto max-w-[1100px]"><p className="text-[11px] font-semibold tracking-[.11em] text-[#91412e] uppercase">Platform controls</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.045em] sm:text-4xl">Platform settings</h1><p className="mt-2 text-sm text-stone-500">Marketplace configuration is environment-managed. Payment, email and database readiness are available through the health endpoint.</p><section className="mt-7 border border-stone-200 bg-[#fcfaf6] p-6"><p className="text-sm leading-6 text-stone-600">Configure deployment secrets and provider credentials in your hosting environment. Product approval, user access, orders and reporting above use live database data.</p></section></div>;
}
