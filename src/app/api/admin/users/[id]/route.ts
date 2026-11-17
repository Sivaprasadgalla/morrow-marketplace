import { hash } from "bcryptjs";
import { isValidObjectId } from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handleApiError, requireRole, slugify } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { AuditLog } from "@/models/AuditLog";
import { User } from "@/models/User";

const emptyToUndefined = (val: unknown) =>
  typeof val === "string" && !val.trim() ? undefined : val;

const updateSchema = z.object({
  name: z.preprocess(emptyToUndefined, z.string().trim().min(2).max(80).optional()),
  email: z.preprocess(
    emptyToUndefined,
    z.string().email().transform((value) => value.toLowerCase()).optional(),
  ),
  password: z.preprocess(emptyToUndefined, z.string().min(10).max(128).optional()),
  role: z.enum(["customer", "vendor", "admin"]).optional(),
  status: z.enum(["active", "pending", "suspended"]).optional(),
  verified: z.boolean().optional(),
  storeName: z.preprocess(emptyToUndefined, z.string().trim().min(2).max(80).optional()),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["admin"]);
    const { id } = await context.params;
    if (!isValidObjectId(id)) throw new ApiError(400, "Invalid user id.");
    if (id === session.user.id) throw new ApiError(409, "Use account settings to change your own administrator account.");
    const input = updateSchema.parse(await request.json());
    await connectDB();
    const before = await User.findOne({ _id: id, deletedAt: { $exists: false } }).lean();
    if (!before) throw new ApiError(404, "User not found.");
    if (input.email && input.email !== before.email && await User.exists({ email: input.email, _id: { $ne: id }, deletedAt: { $exists: false } })) throw new ApiError(409, "Another user already uses this email.");

    const set: Record<string, unknown> = {};
    if (input.name) set.name = input.name;
    if (input.email) set.email = input.email;
    if (input.role) set.role = input.role;
    if (input.status) set.status = input.status;
    if (input.password) {
      set.passwordHash = await hash(input.password, 12);
      set.passwordChangedAt = new Date();
    }
    if (input.verified === true) set.emailVerified = new Date();
    if (input.storeName) {
      set["vendorProfile.storeName"] = input.storeName;
      set["vendorProfile.storeSlug"] = slugify(input.storeName);
    }
    const unset: Record<string, 1> = {};
    if (input.verified === false) unset.emailVerified = 1;
    if (input.role && input.role !== "vendor") {
      unset["vendorProfile.storeName"] = 1;
      unset["vendorProfile.storeSlug"] = 1;
    }
    const hasUnset = Object.keys(unset).length > 0;
    const user = await User.findByIdAndUpdate(
      id,
      { $set: set, ...(hasUnset ? { $unset: unset } : {}) },
      { new: true },
    )
      .select("name email role status emailVerified vendorProfile.storeName createdAt lastLoginAt")
      .lean();
    await AuditLog.create({ actor: session.user.id, action: "user.updated", entityType: "User", entityId: id, before, after: user });
    return NextResponse.json({ user });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["admin"]);
    const { id } = await context.params;
    if (!isValidObjectId(id)) throw new ApiError(400, "Invalid user id.");
    if (id === session.user.id) throw new ApiError(409, "You cannot delete your own administrator account.");
    await connectDB();
    const user = await User.findOneAndUpdate({ _id: id, deletedAt: { $exists: false } }, { $set: { status: "suspended", deletedAt: new Date() } }, { new: true }).lean();
    if (!user) throw new ApiError(404, "User not found.");
    await AuditLog.create({ actor: session.user.id, action: "user.deleted", entityType: "User", entityId: id, before: user, metadata: { deletion: "soft" } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
