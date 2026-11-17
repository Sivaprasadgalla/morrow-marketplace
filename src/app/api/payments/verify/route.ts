import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handleApiError, requireRole } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { notifyOrderPaid } from "@/lib/notifications";
import { sendOrderConfirmationForOrder } from "@/lib/order-lifecycle";
import { Order } from "@/models/Order";
import { PaymentEvent } from "@/models/PaymentEvent";

const schema = z.object({
  razorpay_order_id: z.string().min(6),
  razorpay_payment_id: z.string().min(6),
  razorpay_signature: z.string().optional(),
});

function signaturesMatch(expected: string, received: string) {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

export async function POST(request: Request) {
  try {
    const session = await requireRole(["customer"]);
    const input = schema.parse(await request.json());
    await connectDB();

    const order = await Order.findOne({
      customer: session.user.id,
      "payment.providerOrderId": input.razorpay_order_id,
    });
    if (!order) throw new ApiError(404, "Payment order not found.");

    const isDemo = input.razorpay_order_id.startsWith("demo_rzp_") && input.razorpay_payment_id.startsWith("pay_demo_");
    if (!isDemo) {
      const secret = process.env.RAZORPAY_KEY_SECRET;
      if (!secret || !input.razorpay_signature) throw new ApiError(400, "Payment signature is missing.");
      const expected = createHmac("sha256", secret)
        .update(`${input.razorpay_order_id}|${input.razorpay_payment_id}`)
        .digest("hex");
      if (!signaturesMatch(expected, input.razorpay_signature)) throw new ApiError(400, "Payment signature verification failed.");
    }

    if (order.payment.status === "captured") {
      return NextResponse.json({ success: true, orderId: order._id, idempotent: true });
    }

    order.status = "paid";
    order.payment.status = "captured";
    order.payment.providerPaymentId = input.razorpay_payment_id;
    order.payment.paidAt = new Date();
    await order.save();

    await PaymentEvent.updateOne(
      { providerEventId: `verify:${input.razorpay_payment_id}` },
      {
        $setOnInsert: {
          eventType: "payment.verified",
          order: order._id,
          payload: input,
          status: "processed",
          processedAt: new Date(),
        },
      },
      { upsert: true },
    );

    await sendOrderConfirmationForOrder(order._id.toString()).catch((error) => console.error("Order confirmation email failed", error));

    const vendorIds = order.items.map((item: { vendor: { toString(): string } }) => item.vendor.toString());
    void notifyOrderPaid(order._id.toString(), order.orderNumber, vendorIds);

    return NextResponse.json({ success: true, orderId: order._id, orderNumber: order.orderNumber });
  } catch (error) {
    return handleApiError(error);
  }
}
