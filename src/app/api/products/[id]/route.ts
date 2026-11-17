import { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handleApiError, requireRole } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { AuditLog } from "@/models/AuditLog";
import { ProductModel } from "@/models/Product";

const updateSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    maker: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().min(30).max(4000).optional(),
    category: z.string().trim().min(2).max(80).optional(),
    productType: z.enum(["physical", "digital", "service"]).optional(),
    fulfilment: z.object({
      requiresShipping: z.boolean().default(true),
      deliveryLabel: z.string().trim().max(160).optional(),
      serviceDurationMinutes: z.number().int().min(5).max(1440).optional(),
    }).optional(),
    materials: z.string().trim().max(500).optional(),
    delivery: z.string().trim().max(200).optional(),
    images: z.array(z.string().url()).min(1).max(8).optional(),
    status: z.enum(["draft", "submitted", "active", "rejected", "archived"]).optional(),
    featured: z.boolean().optional(),
    variants: z.array(z.object({
      _id: z.string().optional(),
      name: z.string().trim().min(1).max(80),
      sku: z.string().trim().min(2).max(40),
      options: z.record(z.string(), z.string()).default({}),
      pricePaise: z.number().int().min(0),
      compareAtPaise: z.number().int().min(0).optional(),
      stock: z.number().int().min(0),
    })).min(1).max(30).optional(),
  })
  .strict();

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await connectDB();
    const product = isValidObjectId(id)
      ? await ProductModel.findById(id).lean()
      : await ProductModel.findOne({ slug: id }).lean();
    if (!product) throw new ApiError(404, "Product not found.");
    return NextResponse.json({ product });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["vendor", "admin"]);
    const { id } = await context.params;
    if (!isValidObjectId(id)) throw new ApiError(400, "Invalid product id.");
    const updates = updateSchema.parse(await request.json());
    await connectDB();

    if (session.user.role !== "admin") {
      delete updates.featured;
      if (updates.status && !["draft", "submitted", "archived"].includes(updates.status)) delete updates.status;
    }

    const query = session.user.role === "admin" ? { _id: id } : { _id: id, vendor: session.user.id };
    const before = await ProductModel.findOne(query).lean();
    if (!before) throw new ApiError(404, "Product not found or not owned by this vendor.");

    const effectiveProductType = updates.productType ?? before.productType ?? "physical";
    if (updates.fulfilment) {
      updates.fulfilment.requiresShipping = effectiveProductType === "physical" && updates.fulfilment.requiresShipping;
      if (effectiveProductType !== "service") updates.fulfilment.serviceDurationMinutes = undefined;
    } else if (effectiveProductType !== "physical") {
      updates.fulfilment = { requiresShipping: false };
    }

    const product = await ProductModel.findOneAndUpdate(query, { $set: updates }, { new: true, runValidators: true });
    await AuditLog.create({
      actor: session.user.id,
      action: "product.updated",
      entityType: "Product",
      entityId: id,
      before,
      after: product?.toObject(),
    });

    return NextResponse.json({ product });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["vendor", "admin"]);
    const { id } = await context.params;
    if (!isValidObjectId(id)) throw new ApiError(400, "Invalid product id.");
    await connectDB();
    const query = session.user.role === "admin" ? { _id: id } : { _id: id, vendor: session.user.id };
    const product = await ProductModel.findOneAndUpdate(query, { $set: { status: "archived" } }, { new: true });
    if (!product) throw new ApiError(404, "Product not found or not owned by this vendor.");
    return NextResponse.json({ product });
  } catch (error) {
    return handleApiError(error);
  }
}
