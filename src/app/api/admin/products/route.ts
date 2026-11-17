import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handleApiError, requireRole } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { notifyProductReviewed } from "@/lib/notifications";
import { AuditLog } from "@/models/AuditLog";
import { ProductModel } from "@/models/Product";

const reviewSchema = z.object({
  productId: z.string().trim().min(1),
  action: z.enum(["approve", "reject", "archive"]),
  note: z.string().trim().max(1000).optional(),
});

export async function GET(request: Request) {
  try {
    await requireRole(["admin"]);
    await connectDB();
    const status = new URL(request.url).searchParams.get("status");
    const query = status && ["draft", "submitted", "active", "rejected", "archived"].includes(status) ? { status } : {};
    const products = await ProductModel.find(query)
      .populate("vendor", "name email status vendorProfile.storeName")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return NextResponse.json({ products });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireRole(["admin"]);
    const input = reviewSchema.parse(await request.json());
    await connectDB();
    const before = await ProductModel.findById(input.productId).lean();
    if (!before) throw new ApiError(404, "Product not found.");
    if (input.action === "approve" && before.status !== "submitted") {
      throw new ApiError(409, "Only submitted products can be approved.");
    }

    const status = input.action === "approve" ? "active" : input.action === "reject" ? "rejected" : "archived";
    const product = await ProductModel.findByIdAndUpdate(
      input.productId,
      { $set: { status, moderation: { note: input.note, reviewedAt: new Date(), reviewedBy: session.user.id } } },
      { new: true, runValidators: true },
    ).populate("vendor", "name email status vendorProfile.storeName");
    await AuditLog.create({
      actor: session.user.id,
      action: `product.${input.action}d`,
      entityType: "Product",
      entityId: input.productId,
      before,
      after: product?.toObject(),
      metadata: { note: input.note },
    });

    if (input.action === "approve" || input.action === "reject") {
      void notifyProductReviewed(
        input.productId,
        before.name,
        before.vendor.toString(),
        input.action === "approve" ? "approved" : "rejected",
        session.user.id,
        input.note,
      );
    }

    return NextResponse.json({ product });
  } catch (error) {
    return handleApiError(error);
  }
}
