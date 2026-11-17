import { connectDB } from "@/lib/db";
import { Notification } from "@/models/Notification";
import { User } from "@/models/User";

type CreateNotificationInput = {
  recipientId: string;
  type: string;
  title: string;
  message: string;
  href?: string;
  entityType?: "Order" | "Product" | "User";
  entityId?: string;
  actorId?: string;
};

export async function createNotification(input: CreateNotificationInput) {
  try {
    await connectDB();
    return await Notification.create({
      recipient: input.recipientId,
      type: input.type,
      title: input.title,
      message: input.message,
      href: input.href,
      entityType: input.entityType,
      entityId: input.entityId,
      actor: input.actorId,
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}

export async function createNotificationForAdmins(input: Omit<CreateNotificationInput, "recipientId">) {
  try {
    await connectDB();
    const admins = await User.find({ role: "admin", status: "active" }).select("_id").lean();
    if (!admins.length) return;
    await Notification.insertMany(
      admins.map((admin) => ({
        recipient: admin._id,
        type: input.type,
        title: input.title,
        message: input.message,
        href: input.href,
        entityType: input.entityType,
        entityId: input.entityId,
        actor: input.actorId,
      })),
    );
  } catch (error) {
    console.error("Failed to create admin notifications:", error);
  }
}

export async function notifyOrderPlaced(orderId: string, orderNumber: string, customerName: string, vendorIds: string[]) {
  const promises: Promise<unknown>[] = [];

  // Notify each vendor involved in the order
  for (const vendorId of [...new Set(vendorIds)]) {
    promises.push(
      createNotification({
        recipientId: vendorId,
        type: "order.placed",
        title: "New order received",
        message: `${customerName} placed order ${orderNumber}.`,
        href: "/vendor/orders",
        entityType: "Order",
        entityId: orderId,
      }),
    );
  }

  // Notify admins
  promises.push(
    createNotificationForAdmins({
      type: "order.placed",
      title: "New order placed",
      message: `${customerName} placed order ${orderNumber}.`,
      href: "/admin/orders",
      entityType: "Order",
      entityId: orderId,
    }),
  );

  await Promise.allSettled(promises);
}

export async function notifyOrderPaid(orderId: string, orderNumber: string, vendorIds: string[]) {
  const promises: Promise<unknown>[] = [];

  for (const vendorId of [...new Set(vendorIds)]) {
    promises.push(
      createNotification({
        recipientId: vendorId,
        type: "order.paid",
        title: "Payment received",
        message: `Payment confirmed for order ${orderNumber}.`,
        href: "/vendor/orders",
        entityType: "Order",
        entityId: orderId,
      }),
    );
  }

  promises.push(
    createNotificationForAdmins({
      type: "order.paid",
      title: "Payment captured",
      message: `Payment confirmed for order ${orderNumber}.`,
      href: "/admin/orders",
      entityType: "Order",
      entityId: orderId,
    }),
  );

  await Promise.allSettled(promises);
}

export async function notifyProductSubmitted(productId: string, productName: string, vendorName: string) {
  await createNotificationForAdmins({
    type: "product.submitted",
    title: "Product awaiting review",
    message: `${vendorName} submitted "${productName}" for approval.`,
    href: "/admin/moderation",
    entityType: "Product",
    entityId: productId,
  });
}

export async function notifyProductReviewed(
  productId: string,
  productName: string,
  vendorId: string,
  action: "approved" | "rejected",
  actorId: string,
  note?: string,
) {
  await createNotification({
    recipientId: vendorId,
    type: action === "approved" ? "product.approved" : "product.rejected",
    title: action === "approved" ? "Product approved" : "Product rejected",
    message: action === "approved"
      ? `"${productName}" is now live on the marketplace.`
      : `"${productName}" was not approved.${note ? ` Note: ${note}` : ""}`,
    href: "/vendor/products",
    entityType: "Product",
    entityId: productId,
    actorId,
  });
}

export async function notifyNewUserRegistered(userId: string, userName: string, userEmail: string) {
  await createNotificationForAdmins({
    type: "user.registered",
    title: "New user registered",
    message: `${userName} (${userEmail}) created an account.`,
    href: "/admin/customers",
    entityType: "User",
    entityId: userId,
  });
}

export async function notifyLowStock(vendorId: string, productName: string, variantName: string, remaining: number) {
  await createNotification({
    recipientId: vendorId,
    type: "stock.low",
    title: "Low stock alert",
    message: `"${productName}" (${variantName}) has only ${remaining} unit${remaining === 1 ? "" : "s"} left.`,
    href: "/vendor/inventory",
    entityType: "Product",
  });
}
