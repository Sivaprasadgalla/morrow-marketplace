import { redirect } from "next/navigation";
import { OrderPlacedView } from "@/components/checkout/order-placed-view";

export default async function OrderPlacedQueryPage({
  searchParams,
}: {
  searchParams: Promise<{ orderNumber?: string; id?: string }>;
}) {
  const { orderNumber, id } = await searchParams;
  const target = orderNumber || id;
  if (!target) {
    redirect("/account");
  }
  return <OrderPlacedView orderIdentifier={target} />;
}
