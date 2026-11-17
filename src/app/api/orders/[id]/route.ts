import { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handleApiError, requireRole } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { AuditLog } from "@/models/AuditLog";
import { Order } from "@/models/Order";

const updateSchema = z.object({
  status: z.enum(["processing", "partially_shipped", "shipped", "delivered", "cancelled", "refunded"]).optional(),
  itemId: z.string().optional(),
  fulfilmentStatus: z.enum(["accepted", "packed", "shipped", "delivered", "cancelled", "returned"]).optional(),
  trackingNumber: z.string().trim().max(100).optional(),
});

function vendorOrderView(order: { _id: unknown; orderNumber: string; items: Array<{ vendor: { toString(): string } }>; createdAt?: Date; updatedAt?: Date; status: string; shippingAddress: unknown }, vendorId: string) {
  return {
    _id: order._id,
    orderNumber: order.orderNumber,
    items: order.items.filter((item) => item.vendor.toString() === vendorId),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    status: order.status,
    shippingAddress: order.shippingAddress,
  };
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole();
    const { id } = await context.params;
    await connectDB();
    const query: Record<string, unknown> = isValidObjectId(id) ? { _id: id } : { orderNumber: id };
    if (session.user.role === "customer") query.customer = session.user.id;
    if (session.user.role === "vendor") query["items.vendor"] = session.user.id;
    const order = await Order.findOne(query).lean();
    if (!order) throw new ApiError(404, "Order not found.");
    return NextResponse.json({ order: session.user.role === "vendor" ? vendorOrderView(order, session.user.id) : order });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["vendor", "admin"]);
    const { id } = await context.params;
    if (!isValidObjectId(id)) throw new ApiError(400, "Invalid order id.");
    const input = updateSchema.parse(await request.json());
    await connectDB();
    const before = await Order.findById(id).lean();
    if (!before) throw new ApiError(404, "Order not found.");

    if (session.user.role === "vendor") {
      if (!input.itemId || !isValidObjectId(input.itemId) || !input.fulfilmentStatus) {
        throw new ApiError(422, "Vendor updates require an item and fulfilment status.");
      }
      const ownedItem = before.items.find(
        (item: { _id: { toString(): string }; vendor: { toString(): string } }) =>
          item._id.toString() === input.itemId && item.vendor.toString() === session.user.id,
      );
      if (!ownedItem) throw new ApiError(403, "This order item does not belong to your store.");
      await Order.updateOne(
        { _id: id, "items._id": input.itemId },
        {
          $set: {
            "items.$.fulfilmentStatus": input.fulfilmentStatus,
            ...(input.trackingNumber ? { "items.$.trackingNumber": input.trackingNumber } : {}),
          },
        },
      );
      const current = await Order.findById(id).lean();
      const itemStatuses = current?.items.map((item: { fulfilmentStatus: string }) => item.fulfilmentStatus) ?? [];
      const orderStatus = itemStatuses.length && itemStatuses.every((status: string) => status === "delivered")
        ? "delivered"
        : itemStatuses.some((status: string) => status === "shipped" || status === "delivered")
          ? "partially_shipped"
          : "processing";
      await Order.updateOne({ _id: id }, { $set: { status: orderStatus } });
    } else if (input.status) {
      await Order.updateOne({ _id: id }, { $set: { status: input.status } });
    }

    const order = await Order.findById(id).lean();
    await AuditLog.create({ actor: session.user.id, action: "order.updated", entityType: "Order", entityId: id, before, after: order });
    return NextResponse.json({ order: session.user.role === "vendor" && order ? vendorOrderView(order, session.user.id) : order });
  } catch (error) {
    return handleApiError(error);
  }
}
