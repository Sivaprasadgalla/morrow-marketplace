import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handleApiError } from "@/lib/api";
import { findValidAuthToken } from "@/lib/auth-tokens";
import { AuthToken } from "@/models/AuthToken";
import { User } from "@/models/User";

const schema = z.object({
  token: z.string().min(32).max(256),
  password: z.string().min(10).max(128),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const record = await findValidAuthToken(input.token, "reset_password");
    if (!record) throw new ApiError(400, "This password reset link is invalid or has expired.");

    const user = await User.findById(record.user).select("+passwordHash");
    if (!user) throw new ApiError(400, "This password reset link is invalid.");
    user.passwordHash = await hash(input.password, 12);
    user.passwordChangedAt = new Date();
    await user.save();
    await AuthToken.deleteMany({ user: user._id, type: "reset_password" });
    return NextResponse.json({ success: true, message: "Password updated. You can now sign in." });
  } catch (error) {
    return handleApiError(error);
  }
}
