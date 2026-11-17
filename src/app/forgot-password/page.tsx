import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/account-access-forms";
import { AuthPageShell } from "@/components/auth/auth-page-shell";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return <AuthPageShell eyebrow="Account recovery" title="Reset your password" description="Enter your account email. We’ll send a secure, single-use link that expires after 30 minutes."><ForgotPasswordForm /></AuthPageShell>;
}
