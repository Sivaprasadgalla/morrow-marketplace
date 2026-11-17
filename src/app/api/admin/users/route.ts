import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handleApiError, requireRole, slugify } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { AuditLog } from "@/models/AuditLog";
import { User } from "@/models/User";

const emptyToUndefined = (val: unknown) =>
  typeof val === "string" && !val.trim() ? undefined : val;

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(10).max(128),
  role: z.enum(["customer", "vendor", "admin"]),
  status: z.enum(["active", "pending", "suspended"]).default("active"),
  verified: z.boolean().default(true),
  storeName: z.preprocess(emptyToUndefined, z.string().trim().min(2).max(80).optional()),
});

export async function GET(request: Request) {
  try {
    await requireRole(["admin"]);
    await connectDB();
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim();
    const role = url.searchParams.get("role");
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 25)));
    const query: Record<string, unknown> = { deletedAt: { $exists: false } };
    if (search) query.$or = [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }, { "vendorProfile.storeName": { $regex: search, $options: "i" } }];
    if (role && ["customer", "vendor", "admin"].includes(role)) query.role = role;

    const [users, total] = await Promise.all([
      User.find(query).select("name email role status emailVerified vendorProfile.storeName createdAt lastLoginAt").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      User.countDocuments(query),
    ]);
    return NextResponse.json({ users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole(["admin"]);
    const input = createSchema.parse(await request.json());
    if (input.role === "vendor" && !input.storeName) throw new ApiError(422, "Store name is required for vendor accounts.");
    await connectDB();
    if (await User.exists({ email: input.email, deletedAt: { $exists: false } })) throw new ApiError(409, "A user already exists for this email.");
    const user = await User.create({
      name: input.name,
      email: input.email,
      passwordHash: await hash(input.password, 12),
      role: input.role,
      status: input.status,
      emailVerified: input.verified ? new Date() : undefined,
      vendorProfile: input.role === "vendor" ? { storeName: input.storeName, storeSlug: slugify(input.storeName ?? ""), onboardingStatus: input.status === "active" ? "approved" : "submitted", verified: input.status === "active" } : undefined,
    });
    await AuditLog.create({ actor: session.user.id, action: "user.created", entityType: "User", entityId: user._id.toString(), after: { name: user.name, email: user.email, role: user.role, status: user.status } });
    return NextResponse.json({ user: await User.findById(user._id).select("name email role status emailVerified vendorProfile.storeName createdAt lastLoginAt").lean() }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
