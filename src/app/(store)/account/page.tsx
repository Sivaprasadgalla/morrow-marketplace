import { CustomerAccount } from "@/components/account/customer-account";
import { verifyPageRole } from "@/lib/dal";

export default async function AccountPage() {
  const session = await verifyPageRole(["customer"]);
  return <CustomerAccount initialName={session.user.name ?? "Morrow collector"} initialEmail={session.user.email ?? ""} />;
}
