import { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handleApiError, requireRole } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { Cart } from "@/models/Cart";
import { ProductModel } from "@/models/Product";

const cartSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string(),
        variantId: z.string(),
        quantity: z.number().int().min(1).max(25),
      }),
    )
    .max(50),
  couponCode: z.string().trim().max(30).optional(),
});

export async function GET() {
  try {
    const session = await requireRole(["customer", "vendor", "admin"]);
    await connectDB();
    const cart = await Cart.findOne({ customer: session.user.id }).populate("items.product").lean();
    return NextResponse.json({ cart: cart ?? { items: [] } });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireRole(["customer", "vendor", "admin"]);
    const input = cartSchema.parse(await request.json());
    if (input.items.some((item) => !isValidObjectId(item.productId) || !isValidObjectId(item.variantId))) {
      throw new ApiError(400, "Cart contains an invalid product or variant id.");
    }

    await connectDB();
    const products = await ProductModel.find({ _id: { $in: input.items.map((item) => item.productId) }, status: "active" }).lean();
    const productMap = new Map(products.map((product) => [product._id.toString(), product]));

    for (const item of input.items) {
      const product = productMap.get(item.productId);
      const variant = product?.variants.find(
        (candidate: { _id: { toString(): string }; stock: number; reserved: number }) => candidate._id.toString() === item.variantId,
      );
      if (!variant) throw new ApiError(409, "One or more cart items are no longer available.");
      if (variant.stock - variant.reserved < item.quantity) {
        throw new ApiError(409, `${product?.name ?? "An item"} has insufficient stock.`);
      }
    }

    const cart = await Cart.findOneAndUpdate(
      { customer: session.user.id },
      {
        $set: {
          items: input.items.map((item) => ({ product: item.productId, variantId: item.variantId, quantity: item.quantity })),
          couponCode: input.couponCode?.toUpperCase(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
      { new: true, upsert: true, runValidators: true },
    );

    return NextResponse.json({ cart });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE() {
  try {
    const session = await requireRole();
    await connectDB();
    await Cart.deleteOne({ customer: session.user.id });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
