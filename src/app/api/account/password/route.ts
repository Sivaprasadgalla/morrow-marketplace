import { compare, hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handleApiError, requireRole } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
  });

export async function POST(request: Request) {
  try {
    const session = await requireRole(["customer", "vendor", "admin"]);
    const input = changePasswordSchema.parse(await request.json());

    await connectDB();
    const user = await User.findById(session.user.id).select("+passwordHash");
    if (!user) throw new ApiError(404, "User account not found.");

    if (!user.passwordHash) {
      throw new ApiError(
        400,
        "This account uses Google Sign-In and does not have a local password set.",
      );
    }

    const matches = await compare(input.currentPassword, user.passwordHash);
    if (!matches) {
      throw new ApiError(400, "Current password does not match our records.");
    }

    user.passwordHash = await hash(input.newPassword, 12);
    user.passwordChangedAt = new Date();
    await user.save();

    return NextResponse.json({
      success: true,
      message: "Password updated successfully. Please use your new password next time you sign in.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
