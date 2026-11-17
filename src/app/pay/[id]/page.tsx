import { ManualOrderPayment } from "@/components/checkout/manual-order-payment";

export default async function PayManualOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ManualOrderPayment orderId={id} />;
}
