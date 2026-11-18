import { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handleApiError, requireRole } from "@/lib/api";
import { mergeCartLines, resolveCart, toCartLines, type CartLine, type CartProduct } from "@/lib/cart";
import { connectDB } from "@/lib/db";
import { Cart } from "@/models/Cart";
import { ProductModel } from "@/models/Product";

const cartSchema = z.object({
  items: z.array(z.object({ productId: z.string(), variantId: z.string(), quantity: z.number().int().min(1).max(25) })).max(50),
  couponCode: z.string().trim().max(30).optional(),
});
const mergeSchema = cartSchema.extend({ mergeId: z.string().uuid() });
type StoredCart = {
  _id: unknown;
  __v?: number;
  items: Array<{ product: { toString(): string }; variantId: { toString(): string }; quantity: number }>;
  mergedGuestCartIds?: string[];
};

function storedLines(cart: StoredCart | null): CartLine[] {
  return cart?.items.map((item) => ({ productId: item.product.toString(), variantId: item.variantId.toString(), quantity: item.quantity })) ?? [];
}

async function currentItems(lines: CartLine[]) {
  const ids = lines.map((item) => item.productId).filter((id) => isValidObjectId(id));
  const products = await ProductModel.find({ _id: { $in: ids }, status: "active" }).lean();
  return resolveCart(lines, products as unknown as CartProduct[]);
}

function expiresAt() { return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); }
function dbItems(lines: CartLine[]) { return lines.map((item) => ({ product: item.productId, variantId: item.variantId, quantity: item.quantity })); }

export async function GET() {
  try {
    const session = await requireRole(["customer", "vendor", "admin"]);
    await connectDB();
    const cart = await Cart.findOne({ customer: session.user.id }).lean() as StoredCart | null;
    return NextResponse.json({ cart: cart ?? { items: [] }, ...await currentItems(storedLines(cart)) });
  } catch (error) { return handleApiError(error); }
}

// Merge once per guest snapshot. Optimistic concurrency also protects simultaneous sign-ins.
export async function POST(request: Request) {
  try {
    const session = await requireRole(["customer", "vendor", "admin"]);
    const input = mergeSchema.parse(await request.json());
    await connectDB();
    await Cart.updateOne({ customer: session.user.id }, { $setOnInsert: { items: [], mergedGuestCartIds: [], expiresAt: expiresAt(), __v: 0 } }, { upsert: true });
    for (let attempt = 0; attempt < 5; attempt++) {
      const cart = await Cart.findOne({ customer: session.user.id }).lean() as StoredCart | null;
      if (!cart) continue;
      if (cart.mergedGuestCartIds?.includes(input.mergeId)) {
        return NextResponse.json({ cart, ...await currentItems(storedLines(cart)) });
      }
      const result = await currentItems(mergeCartLines(storedLines(cart), input.items));
      const saved = await Cart.findOneAndUpdate(
        { _id: cart._id, __v: cart.__v ?? { $exists: false } },
        { $set: { items: dbItems(toCartLines(result.items)), expiresAt: expiresAt() }, $inc: { __v: 1 }, $push: { mergedGuestCartIds: { $each: [input.mergeId], $slice: -100 } } },
        { new: true, runValidators: true },
      );
      if (saved) return NextResponse.json({ cart: saved, ...result });
    }
    throw new ApiError(409, "Your bag changed in another session. Please retry syncing it.");
  } catch (error) { return handleApiError(error); }
}

export async function PUT(request: Request) {
  try {
    const session = await requireRole(["customer", "vendor", "admin"]);
    const input = cartSchema.parse(await request.json());
    await connectDB();
    const result = await currentItems(input.items);
    const cart = await Cart.findOneAndUpdate(
      { customer: session.user.id },
      { $set: { items: dbItems(toCartLines(result.items)), couponCode: input.couponCode?.toUpperCase(), expiresAt: expiresAt() }, $inc: { __v: 1 } },
      { new: true, upsert: true, runValidators: true },
    );
    return NextResponse.json({ cart, ...result });
  } catch (error) { return handleApiError(error); }
}

export async function DELETE() {
  try {
    const session = await requireRole();
    await connectDB();
    await Cart.deleteOne({ customer: session.user.id });
    return NextResponse.json({ success: true });
  } catch (error) { return handleApiError(error); }
}
