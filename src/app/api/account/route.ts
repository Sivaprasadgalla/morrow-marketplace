import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handleApiError, requireRole, slugify } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

const addressSchema = z.object({
  _id: z.string().optional(),
  label: z.string().trim().min(2).max(30),
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(8).max(18),
  line1: z.string().trim().min(4).max(160),
  line2: z.string().trim().max(160).optional(),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  postalCode: z.string().trim().min(5).max(10),
  country: z.string().trim().default("India"),
  isDefault: z.boolean().default(false),
});

const updateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().min(8).max(18).optional(),
  addresses: z.array(addressSchema).max(10).optional(),
  storeName: z.string().trim().min(2).max(80).optional(),
  storeDescription: z.string().trim().max(1000).optional(),
});

const fields = "name email phone addresses vendorProfile role emailVerified createdAt";

export async function GET() {
  try {
    const session = await requireRole(["customer", "vendor", "admin"]);
    await connectDB();
    const user = await User.findById(session.user.id).select(fields).lean();
    if (!user) throw new ApiError(404, "Account not found.");
    return NextResponse.json({ user });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireRole(["customer", "vendor", "admin"]);
    const input = updateSchema.parse(await request.json());
    await connectDB();

    const updateQuery: Record<string, unknown> = {};
    if (input.name) updateQuery.name = input.name;
    if (input.phone !== undefined) updateQuery.phone = input.phone;

    if (input.addresses) {
      const defaultIndex = input.addresses.findIndex((address) => address.isDefault);
      updateQuery.addresses =
        defaultIndex > -1
          ? input.addresses.map((address, index) => ({
              ...address,
              isDefault: index === defaultIndex,
            }))
          : input.addresses;
    }

    if (session.user.role === "vendor" || session.user.role === "admin") {
      if (input.storeName) {
        updateQuery["vendorProfile.storeName"] = input.storeName;
        updateQuery["vendorProfile.storeSlug"] = slugify(input.storeName);
      }
      if (input.storeDescription !== undefined) {
        updateQuery["vendorProfile.description"] = input.storeDescription;
      }
    }

    const user = await User.findByIdAndUpdate(
      session.user.id,
      { $set: updateQuery },
      { new: true, runValidators: true },
    )
      .select(fields)
      .lean();

    if (!user) throw new ApiError(404, "Account not found.");
    return NextResponse.json({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
