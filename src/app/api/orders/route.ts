import { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handleApiError, requireRole } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { notifyOrderPlaced } from "@/lib/notifications";
import { releaseExpiredOrders } from "@/lib/order-lifecycle";
import { Cart } from "@/models/Cart";
import { InventoryMovement } from "@/models/InventoryMovement";
import { Order } from "@/models/Order";
import { ProductModel } from "@/models/Product";
import { User } from "@/models/User";

const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string(),
        variantId: z.string(),
        quantity: z.number().int().min(1).max(25),
      }),
    )
    .min(1)
    .max(50),
  shippingAddress: z.object({
    name: z.string().trim().min(2).max(80),
    phone: z.string().trim().min(8).max(18),
    line1: z.string().trim().min(4).max(160),
    line2: z.string().trim().max(160).optional(),
    city: z.string().trim().min(2).max(80),
    state: z.string().trim().min(2).max(80),
    postalCode: z.string().trim().min(5).max(10),
    country: z.string().trim().default("India"),
  }),
  couponCode: z.string().trim().max(30).optional(),
});

function createOrderNumber() {
  const date = new Date().toISOString().slice(2, 10).replaceAll("-", "");
  return `MR-${date}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

export async function GET(request: Request) {
  try {
    const session = await requireRole();
    await connectDB();
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));
    const query: Record<string, unknown> = {};
    if (session.user.role === "customer") query.customer = session.user.id;
    if (session.user.role === "vendor") query["items.vendor"] = session.user.id;

    const [items, total] = await Promise.all([
      Order.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Order.countDocuments(query),
    ]);

    return NextResponse.json({ items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  const reserved: Array<{ productId: string; variantId: string; quantity: number; vendorId: string }> = [];

  try {
    const session = await requireRole(["customer"]);
    const input = checkoutSchema.parse(await request.json());
    if (input.items.some((item) => !isValidObjectId(item.productId) || !isValidObjectId(item.variantId))) {
      throw new ApiError(400, "Checkout contains an invalid product or variant id.");
    }

    await connectDB();
    await releaseExpiredOrders(10);
    const products = await ProductModel.find({ _id: { $in: input.items.map((item) => item.productId) }, status: "active" }).lean();
    const productMap = new Map(products.map((product) => [product._id.toString(), product]));
    const vendorIds = [...new Set(products.map((product) => product.vendor.toString()))];
    const vendors = await User.find({ _id: { $in: vendorIds } }).select("vendorProfile.commissionRateBps").lean();
    const commissionMap = new Map(vendors.map((vendor) => [vendor._id.toString(), vendor.vendorProfile?.commissionRateBps ?? 1200]));

    const orderItems = input.items.map((item) => {
      const product = productMap.get(item.productId);
      const variant = product?.variants.find(
        (candidate: { _id: { toString(): string }; pricePaise: number; stock: number; reserved: number; name: string; sku: string }) =>
          candidate._id.toString() === item.variantId,
      );
      if (!product || !variant) throw new ApiError(409, "One or more items are no longer available.");
      if (variant.stock - variant.reserved < item.quantity) throw new ApiError(409, `${product.name} has insufficient stock.`);

      const lineSubtotal = variant.pricePaise * item.quantity;
      const taxPaise = Math.round(lineSubtotal * 0.18);
      const lineTotalPaise = lineSubtotal + taxPaise;
      const commissionPaise = Math.round(lineSubtotal * ((commissionMap.get(product.vendor.toString()) ?? 1200) / 10000));

      return {
        product: product._id,
        vendor: product.vendor,
        variantId: variant._id,
        productName: product.name,
        variantName: variant.name,
        sku: variant.sku,
        image: product.images[0],
        productType: product.productType ?? "physical",
        requiresShipping: product.fulfilment?.requiresShipping ?? product.productType !== "digital",
        quantity: item.quantity,
        unitPricePaise: variant.pricePaise,
        taxPaise,
        lineTotalPaise,
        commissionPaise,
        vendorPayablePaise: lineSubtotal - commissionPaise,
      };
    });

    for (const item of input.items) {
      const product = productMap.get(item.productId)!;
      const updated = await ProductModel.findOneAndUpdate(
        {
          _id: item.productId,
          status: "active",
          variants: { $elemMatch: { _id: item.variantId, stock: { $gte: item.quantity } } },
        },
        { $inc: { "variants.$[variant].stock": -item.quantity } },
        { arrayFilters: [{ "variant._id": item.variantId, "variant.stock": { $gte: item.quantity } }], new: true },
      );

      if (!updated) throw new ApiError(409, `${product.name} sold out while you were checking out.`);
      reserved.push({ productId: item.productId, variantId: item.variantId, quantity: item.quantity, vendorId: product.vendor.toString() });
    }

    const subtotalPaise = orderItems.reduce((sum, item) => sum + item.unitPricePaise * item.quantity, 0);
    const taxPaise = orderItems.reduce((sum, item) => sum + item.taxPaise, 0);
    const requiresShipping = orderItems.some((item) => item.requiresShipping);
    const shippingPaise = !requiresShipping || subtotalPaise >= 500000 ? 0 : 25000;
    const discountPaise = input.couponCode?.toUpperCase() === "WELCOME10" ? Math.round(subtotalPaise * 0.1) : 0;

    const order = await Order.create({
      orderNumber: createOrderNumber(),
      customer: session.user.id,
      items: orderItems,
      shippingAddress: input.shippingAddress,
      subtotalPaise,
      taxPaise,
      shippingPaise,
      discountPaise,
      totalPaise: subtotalPaise + taxPaise + shippingPaise - discountPaise,
      couponCode: input.couponCode?.toUpperCase(),
      paymentExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    await Promise.all([
      Cart.deleteOne({ customer: session.user.id }),
      InventoryMovement.insertMany(
        reserved.map((item) => ({
          product: item.productId,
          variantId: item.variantId,
          vendor: item.vendorId,
          type: "reservation",
          quantityDelta: -item.quantity,
          referenceType: "Order",
          referenceId: order._id.toString(),
          actor: session.user.id,
        })),
      ),
    ]);

    const orderVendorIds = reserved.map((item) => item.vendorId);
    void notifyOrderPlaced(order._id.toString(), order.orderNumber, session.user.name ?? "A customer", orderVendorIds);

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    if (reserved.length) {
      await Promise.allSettled(
        reserved.map((item) =>
          ProductModel.updateOne(
            { _id: item.productId },
            { $inc: { "variants.$[variant].stock": item.quantity } },
            { arrayFilters: [{ "variant._id": item.variantId }] },
          ),
        ),
      );
    }
    return handleApiError(error);
  }
}
