import { createHash, randomBytes } from "crypto";
import { connectDB } from "@/lib/db";
import { AuthToken } from "@/models/AuthToken";

export type AuthTokenType = "verify_email" | "reset_password";

export function hashAuthToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createAuthToken(userId: string, email: string, type: AuthTokenType) {
  await connectDB();
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + (type === "verify_email" ? 24 * 60 * 60 * 1000 : 30 * 60 * 1000));

  await AuthToken.deleteMany({ user: userId, type });
  await AuthToken.create({ user: userId, email, type, tokenHash: hashAuthToken(token), expiresAt });
  return { token, expiresAt };
}

export async function findValidAuthToken(token: string, type: AuthTokenType) {
  await connectDB();
  return AuthToken.findOne({ tokenHash: hashAuthToken(token), type, expiresAt: { $gt: new Date() } });
}
