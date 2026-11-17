import { createHash, createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { releaseOrderInventory, sendOrderConfirmationForOrder } from "@/lib/order-lifecycle";
import { Order } from "@/models/Order";
import { PaymentEvent } from "@/models/PaymentEvent";

function verifySignature(body: string, signature: string, secret: string) {
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(signature);
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook secret is not configured." }, { status: 503 });

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  await connectDB();
  const payload = JSON.parse(rawBody) as {
    event: string;
    payload?: { payment?: { entity?: { id?: string; order_id?: string } } };
  };
  const providerEventId =
    request.headers.get("x-razorpay-event-id") ?? createHash("sha256").update(rawBody).digest("hex");

  const existing = await PaymentEvent.findOne({ providerEventId }).lean();
  if (existing) return NextResponse.json({ received: true, idempotent: true });

  const event = await PaymentEvent.create({ providerEventId, eventType: payload.event, payload, status: "received" });

  try {
    const payment = payload.payload?.payment?.entity;
    if (payload.event === "payment.captured" && payment?.order_id) {
      const order = await Order.findOneAndUpdate(
        { "payment.providerOrderId": payment.order_id, status: "awaiting_payment", "payment.status": { $ne: "captured" } },
        {
          $set: {
            status: "paid",
            "payment.status": "captured",
            "payment.providerPaymentId": payment.id,
            "payment.paidAt": new Date(),
          },
        },
        { new: true },
      );
      if (order) {
        event.order = order._id;
        await sendOrderConfirmationForOrder(order._id.toString()).catch((error) => console.error("Order confirmation email failed", error));
      }
    }
    if (payload.event === "payment.failed" && payment?.order_id) {
      const order = await Order.findOne({ "payment.providerOrderId": payment.order_id }).select("_id").lean();
      if (order) {
        event.order = order._id;
        await releaseOrderInventory(order._id.toString(), "payment_failed");
      }
    }
    event.status = "processed";
    event.processedAt = new Date();
    await event.save();
    return NextResponse.json({ received: true });
  } catch (error) {
    event.status = "failed";
    event.error = error instanceof Error ? error.message : "Unknown webhook error";
    await event.save();
    return NextResponse.json({ received: true }, { status: 202 });
  }
}
