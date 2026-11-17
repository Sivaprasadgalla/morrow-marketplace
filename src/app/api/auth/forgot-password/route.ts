import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/api";
import { createAuthToken } from "@/lib/auth-tokens";
import { connectDB } from "@/lib/db";
import { getPasswordResetUrl, sendPasswordResetEmail } from "@/lib/email";
import { User } from "@/models/User";

const schema = z.object({ email: z.string().email().transform((value) => value.toLowerCase()) });
const genericMessage = "If an account exists for that email, we sent a password reset link.";

export async function POST(request: Request) {
  try {
    const { email } = schema.parse(await request.json());
    await connectDB();
    const user = await User.findOne({ email, passwordHash: { $exists: true } });
    if (!user) return NextResponse.json({ message: genericMessage });

    const { token } = await createAuthToken(user._id.toString(), user.email, "reset_password");
    let emailSent = false;
    try {
      emailSent = (await sendPasswordResetEmail(user.name, user.email, token)).sent;
    } catch (error) {
      console.error("Password reset email delivery failed", error);
    }
    return NextResponse.json({
      message: genericMessage,
      ...(!emailSent && !process.env.RESEND_API_KEY && process.env.NODE_ENV !== "production" ? { resetUrl: getPasswordResetUrl(token) } : {}),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
