import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handleApiError, slugify } from "@/lib/api";
import { createAuthToken } from "@/lib/auth-tokens";
import { connectDB } from "@/lib/db";
import { getVerificationUrl, sendVerificationEmail } from "@/lib/email";
import { notifyNewUserRegistered } from "@/lib/notifications";
import { User } from "@/models/User";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(10).max(128),
  accountType: z.enum(["customer", "vendor"]).default("customer"),
  storeName: z.string().trim().min(2).max(80).optional(),
});

export async function POST(request: Request) {
  try {
    const input = registerSchema.parse(await request.json());
    if (input.accountType === "vendor" && !input.storeName) {
      throw new ApiError(422, "Store name is required for vendor registration.");
    }

    await connectDB();
    const exists = await User.exists({ email: input.email });
    if (exists) throw new ApiError(409, "An account already exists for this email.");

    const user = await User.create({
      name: input.name,
      email: input.email,
      passwordHash: await hash(input.password, 12),
      role: input.accountType,
      status: "pending",
      vendorProfile:
        input.accountType === "vendor"
          ? {
              storeName: input.storeName,
              storeSlug: slugify(input.storeName ?? ""),
              onboardingStatus: "submitted",
            }
          : undefined,
    });

    const { token } = await createAuthToken(user._id.toString(), user.email, "verify_email");
    void notifyNewUserRegistered(user._id.toString(), user.name, user.email);
    let emailSent = false;
    try {
      emailSent = (await sendVerificationEmail(user.name, user.email, token)).sent;
    } catch (error) {
      console.error("Verification email delivery failed", error);
    }

    return NextResponse.json(
      {
        user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role },
        message:
          input.accountType === "vendor"
            ? "Verify your email, then your vendor application will be reviewed."
            : "Account created. Check your email to activate it.",
        ...(!emailSent && !process.env.RESEND_API_KEY && process.env.NODE_ENV !== "production" ? { verificationUrl: getVerificationUrl(token) } : {}),
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
