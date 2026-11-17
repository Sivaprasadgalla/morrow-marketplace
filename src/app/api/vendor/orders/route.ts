import { NextResponse } from "next/server";
import { handleApiError, requireRole } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";

export async function GET() {
  try {
    const session = await requireRole(["vendor"]);
    await connectDB();
    const orders = await Order.find({ "items.vendor": session.user.id, "payment.status": "captured" })
      .select("orderNumber customer items shippingAddress status payment createdAt")
      .populate("customer", "name email")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return NextResponse.json({ orders: orders.map((order) => ({ ...order, items: order.items.filter((item: { vendor: { toString(): string } }) => item.vendor.toString() === session.user.id) })) });
  } catch (error) {
    return handleApiError(error);
  }
}
