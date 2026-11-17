import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/api";
import { createAuthToken } from "@/lib/auth-tokens";
import { connectDB } from "@/lib/db";
import { getVerificationUrl, sendVerificationEmail } from "@/lib/email";
import { User } from "@/models/User";

const schema = z.object({ email: z.string().email().transform((value) => value.toLowerCase()) });
const genericMessage = "If that account still needs verification, a new email has been sent.";

export async function POST(request: Request) {
  try {
    const { email } = schema.parse(await request.json());
    await connectDB();
    const user = await User.findOne({ email, emailVerified: { $exists: false } });
    if (!user) return NextResponse.json({ message: genericMessage });

    const { token } = await createAuthToken(user._id.toString(), user.email, "verify_email");
    let emailSent = false;
    try {
      emailSent = (await sendVerificationEmail(user.name, user.email, token)).sent;
    } catch (error) {
      console.error("Verification email delivery failed", error);
    }
    return NextResponse.json({
      message: genericMessage,
      ...(!emailSent && !process.env.RESEND_API_KEY && process.env.NODE_ENV !== "production" ? { verificationUrl: getVerificationUrl(token) } : {}),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
