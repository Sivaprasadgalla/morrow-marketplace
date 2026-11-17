import { OrderPlacedView } from "@/components/checkout/order-placed-view";

export default async function OrderPlacedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrderPlacedView orderIdentifier={id} />;
}
