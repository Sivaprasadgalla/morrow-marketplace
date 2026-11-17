import { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";
import { ApiError, handleApiError, requireRole } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { releaseOrderInventory } from "@/lib/order-lifecycle";
import { Order } from "@/models/Order";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["customer"]);
    const { id } = await context.params;
    if (!isValidObjectId(id)) throw new ApiError(400, "Invalid order id.");
    await connectDB();
    const order = await Order.findOne({ _id: id, customer: session.user.id }).select("_id status payment.status").lean();
    if (!order) throw new ApiError(404, "Order not found.");
    if (order.payment?.status === "captured") throw new ApiError(409, "A paid order cannot be cancelled from checkout.");
    const result = await releaseOrderInventory(id, "checkout_cancelled");
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
