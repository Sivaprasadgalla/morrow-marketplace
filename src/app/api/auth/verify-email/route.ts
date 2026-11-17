import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handleApiError } from "@/lib/api";
import { findValidAuthToken } from "@/lib/auth-tokens";
import { AuthToken } from "@/models/AuthToken";
import { User } from "@/models/User";

const schema = z.object({ token: z.string().min(32).max(256) });

export async function POST(request: Request) {
  try {
    const { token } = schema.parse(await request.json());
    const record = await findValidAuthToken(token, "verify_email");
    if (!record) throw new ApiError(400, "This verification link is invalid or has expired.");

    const user = await User.findById(record.user);
    if (!user) throw new ApiError(400, "This verification link is invalid.");

    user.emailVerified = new Date();
    if (user.role === "customer" && user.status === "pending") user.status = "active";
    await user.save();
    await AuthToken.deleteMany({ user: user._id, type: "verify_email" });

    return NextResponse.json({
      success: true,
      message: user.role === "vendor" ? "Email verified. Your vendor application is awaiting approval." : "Email verified. You can now sign in.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
