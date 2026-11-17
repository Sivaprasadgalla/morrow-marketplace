import { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { z } from "zod";
import { ApiError, handleApiError, requireRole } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { releaseOrderInventory } from "@/lib/order-lifecycle";
import { Order } from "@/models/Order";

const schema = z.object({ internalOrderId: z.string() });

export async function POST(request: Request) {
  try {
    const session = await requireRole(["customer"]);
    const { internalOrderId } = schema.parse(await request.json());
    if (!isValidObjectId(internalOrderId)) throw new ApiError(400, "Invalid order id.");
    await connectDB();

    const order = await Order.findOne({
      _id: internalOrderId,
      customer: session.user.id,
      status: "awaiting_payment",
    });
    if (!order) throw new ApiError(404, "Payable order not found.");

    if (order.paymentExpiresAt && order.paymentExpiresAt <= new Date()) {
      await releaseOrderInventory(order._id.toString(), "payment_expired");
      throw new ApiError(410, "This payment session expired. Your reserved stock has been released.");
    }

    if (order.payment?.providerOrderId) {
      return NextResponse.json({
        providerOrderId: order.payment.providerOrderId,
        amount: order.totalPaise,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID ?? "demo",
        demo: order.payment.providerOrderId.startsWith("demo_rzp_"),
      });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      const providerOrderId = `demo_rzp_${crypto.randomUUID()}`;
      order.payment.providerOrderId = providerOrderId;
      await order.save();
      return NextResponse.json({
        providerOrderId,
        amount: order.totalPaise,
        currency: order.currency,
        keyId: "demo",
        demo: true,
      });
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const providerOrder = await razorpay.orders.create({
      amount: order.totalPaise,
      currency: order.currency,
      receipt: order.orderNumber.slice(0, 40),
      notes: { internalOrderId: order._id.toString(), customerId: session.user.id },
    });

    order.payment.providerOrderId = providerOrder.id;
    await order.save();

    return NextResponse.json({
      providerOrderId: providerOrder.id,
      amount: providerOrder.amount,
      currency: providerOrder.currency,
      keyId,
      demo: false,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
