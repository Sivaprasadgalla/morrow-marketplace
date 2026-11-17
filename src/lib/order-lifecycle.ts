import { connectDB } from "@/lib/db";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { InventoryMovement } from "@/models/InventoryMovement";
import { Order } from "@/models/Order";
import { ProductModel } from "@/models/Product";
import { User } from "@/models/User";

export async function releaseOrderInventory(orderId: string, reason: string) {
  await connectDB();
  const staleClaim = new Date(Date.now() - 5 * 60 * 1000);
  const order = await Order.findOneAndUpdate(
    {
      _id: orderId,
      inventoryReleasedAt: { $exists: false },
      $or: [
        { status: "awaiting_payment", "payment.status": { $ne: "captured" }, inventoryReleaseClaimedAt: { $exists: false } },
        { status: "cancelled", "payment.status": "failed", inventoryReleaseClaimedAt: { $lt: staleClaim } },
      ],
    },
    {
      $set: {
        status: "cancelled",
        "payment.status": "failed",
        inventoryReleaseClaimedAt: new Date(),
      },
    },
    { new: true },
  ).lean();

  if (!order) return { released: false, reason: "already_processed" as const };

  try {
    await Promise.all(
      order.items.map((item: { product: { toString(): string }; variantId: { toString(): string }; quantity: number }) =>
        ProductModel.updateOne(
          { _id: item.product },
          { $inc: { "variants.$[variant].stock": item.quantity } },
          { arrayFilters: [{ "variant._id": item.variantId }] },
        ),
      ),
    );

    await InventoryMovement.insertMany(
      order.items.map((item: { product: unknown; variantId: unknown; vendor: unknown; quantity: number }) => ({
        product: item.product,
        variantId: item.variantId,
        vendor: item.vendor,
        type: "release",
        quantityDelta: item.quantity,
        referenceType: "Order",
        referenceId: order._id.toString(),
        reason,
      })),
    );

    await Order.updateOne(
      { _id: order._id, inventoryReleasedAt: { $exists: false } },
      { $set: { inventoryReleasedAt: new Date() }, $unset: { inventoryReleaseClaimedAt: 1 } },
    );
    return { released: true, orderNumber: order.orderNumber };
  } catch (error) {
    await Order.updateOne({ _id: order._id }, { $unset: { inventoryReleaseClaimedAt: 1 } });
    throw error;
  }
}

export async function releaseExpiredOrders(limit = 50) {
  await connectDB();
  const expired = await Order.find({
    status: "awaiting_payment",
    "payment.status": { $ne: "captured" },
    paymentExpiresAt: { $lte: new Date() },
    inventoryReleasedAt: { $exists: false },
  })
    .select("_id")
    .limit(limit)
    .lean();

  const results = await Promise.allSettled(expired.map((order) => releaseOrderInventory(order._id.toString(), "payment_expired")));
  return {
    scanned: expired.length,
    released: results.filter((result) => result.status === "fulfilled" && result.value.released).length,
    failed: results.filter((result) => result.status === "rejected").length,
  };
}

export async function sendOrderConfirmationForOrder(orderId: string) {
  await connectDB();
  const staleClaim = new Date(Date.now() - 10 * 60 * 1000);
  const order = await Order.findOneAndUpdate(
    {
      _id: orderId,
      status: { $in: ["paid", "processing", "partially_shipped", "shipped", "delivered"] },
      "payment.status": "captured",
      "notifications.confirmationSentAt": { $exists: false },
      $or: [
        { "notifications.confirmationClaimedAt": { $exists: false } },
        { "notifications.confirmationClaimedAt": { $lt: staleClaim } },
      ],
    },
    { $set: { "notifications.confirmationClaimedAt": new Date() } },
    { new: true },
  ).lean();

  if (!order) return { sent: false, reason: "already_processed" as const };

  try {
    const customer = await User.findById(order.customer).select("name email").lean();
    if (!customer?.email) throw new Error("Order customer email is unavailable.");
    const result = await sendOrderConfirmationEmail({
      customerName: customer.name,
      customerEmail: customer.email,
      orderNumber: order.orderNumber,
      totalPaise: order.totalPaise,
      items: order.items.map((item: { productName: string; quantity: number }) => ({ productName: item.productName, quantity: item.quantity })),
    });

    if (!result.sent) {
      await Order.updateOne({ _id: order._id }, { $unset: { "notifications.confirmationClaimedAt": 1 } });
      return result;
    }

    await Order.updateOne(
      { _id: order._id },
      { $set: { "notifications.confirmationSentAt": new Date() }, $unset: { "notifications.confirmationClaimedAt": 1 } },
    );
    return result;
  } catch (error) {
    await Order.updateOne({ _id: order._id }, { $unset: { "notifications.confirmationClaimedAt": 1 } });
    throw error;
  }
}
