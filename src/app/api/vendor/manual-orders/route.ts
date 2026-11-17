import { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handleApiError, requireRole } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { sendManualOrderPaymentEmail } from "@/lib/email";
import { AuditLog } from "@/models/AuditLog";
import { InventoryMovement } from "@/models/InventoryMovement";
import { Order } from "@/models/Order";
import { ProductModel } from "@/models/Product";
import { User } from "@/models/User";

const schema = z.object({
  customerEmail: z.string().email().transform((value) => value.toLowerCase()),
  productId: z.string(),
  variantId: z.string(),
  quantity: z.number().int().min(1).max(25),
  shippingAddress: z.object({
    name: z.string().trim().min(2).max(80), phone: z.string().trim().min(8).max(18), line1: z.string().trim().min(4).max(160),
    line2: z.string().trim().max(160).optional(), city: z.string().trim().min(2).max(80), state: z.string().trim().min(2).max(80), postalCode: z.string().trim().min(5).max(10), country: z.string().trim().default("India"),
  }),
});

function createOrderNumber() { return `MR-MAN-${new Date().toISOString().slice(2, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`; }

export async function POST(request: Request) {
  let reservation: { productId: string; variantId: string; quantity: number } | undefined;
  let createdOrderId: string | undefined;
  try {
    const session = await requireRole(["vendor"]);
    const input = schema.parse(await request.json());
    if (!isValidObjectId(input.productId) || !isValidObjectId(input.variantId)) throw new ApiError(400, "Choose a valid product and variant.");
    await connectDB();
    const [customer, vendor, product] = await Promise.all([
      User.findOne({ email: input.customerEmail, role: "customer", status: "active", emailVerified: { $ne: null }, deletedAt: { $exists: false } }).lean(),
      User.findById(session.user.id).select("vendorProfile.commissionRateBps").lean(),
      ProductModel.findOne({ _id: input.productId, vendor: session.user.id, status: "active" }).lean(),
    ]);
    if (!customer) throw new ApiError(404, "The customer must have an active, verified Morrow account before you can send an invoice.");
    const variant = product?.variants.find((item: { _id: { toString(): string } }) => item._id.toString() === input.variantId);
    if (!product || !variant) throw new ApiError(404, "Product or variant not found in your active catalogue.");
    if (variant.stock < input.quantity) throw new ApiError(409, "There is not enough stock for this manual order.");

    const updated = await ProductModel.findOneAndUpdate(
      { _id: product._id, vendor: session.user.id, variants: { $elemMatch: { _id: input.variantId, stock: { $gte: input.quantity } } } },
      { $inc: { "variants.$[variant].stock": -input.quantity } },
      { arrayFilters: [{ "variant._id": input.variantId, "variant.stock": { $gte: input.quantity } }], new: true },
    );
    if (!updated) throw new ApiError(409, "Stock changed while creating this order. Please try again.");
    reservation = { productId: input.productId, variantId: input.variantId, quantity: input.quantity };

    const subtotalPaise = variant.pricePaise * input.quantity;
    const taxPaise = Math.round(subtotalPaise * 0.18);
    const commissionPaise = Math.round(subtotalPaise * ((vendor?.vendorProfile?.commissionRateBps ?? 1200) / 10000));
    const requiresShipping = product.fulfilment?.requiresShipping ?? product.productType !== "digital";
    const shippingPaise = requiresShipping && subtotalPaise < 500000 ? 25000 : 0;
    const order = await Order.create({
      orderNumber: createOrderNumber(), customer: customer._id, source: "manual", createdByVendor: session.user.id, shippingAddress: input.shippingAddress,
      items: [{ product: product._id, vendor: session.user.id, variantId: variant._id, productName: product.name, variantName: variant.name, sku: variant.sku, image: product.images[0], productType: product.productType ?? "physical", requiresShipping, quantity: input.quantity, unitPricePaise: variant.pricePaise, taxPaise, lineTotalPaise: subtotalPaise + taxPaise, commissionPaise, vendorPayablePaise: subtotalPaise - commissionPaise }],
      subtotalPaise, taxPaise, shippingPaise, totalPaise: subtotalPaise + taxPaise + shippingPaise, paymentExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    });
    createdOrderId = order._id.toString();
    await InventoryMovement.create({ product: product._id, variantId: variant._id, vendor: session.user.id, type: "reservation", quantityDelta: -input.quantity, referenceType: "Order", referenceId: order._id.toString(), actor: session.user.id, reason: "vendor_manual_order" });
    await AuditLog.create({ actor: session.user.id, action: "order.manual_created", entityType: "Order", entityId: order._id.toString(), after: { orderNumber: order.orderNumber, customerId: customer._id.toString(), totalPaise: order.totalPaise, source: "manual" } });
    const paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000"}/pay/${order._id}`;
    const email = await sendManualOrderPaymentEmail({ customerName: customer.name, customerEmail: customer.email, orderNumber: order.orderNumber, totalPaise: order.totalPaise, items: [{ productName: product.name, quantity: input.quantity }], paymentUrl }).catch((error) => ({ sent: false as const, reason: error instanceof Error ? error.message : "email_failed" }));
    return NextResponse.json({ order, paymentUrl, emailSent: email.sent }, { status: 201 });
  } catch (error) {
    if (createdOrderId) {
      await Promise.all([
        Order.deleteOne({ _id: createdOrderId }),
        InventoryMovement.deleteMany({ referenceType: "Order", referenceId: createdOrderId }),
        AuditLog.deleteMany({ entityType: "Order", entityId: createdOrderId, action: "order.manual_created" }),
      ]).catch(() => undefined);
    }
    if (reservation) await ProductModel.updateOne({ _id: reservation.productId }, { $inc: { "variants.$[variant].stock": reservation.quantity } }, { arrayFilters: [{ "variant._id": reservation.variantId }] }).catch(() => undefined);
    return handleApiError(error);
  }
}
