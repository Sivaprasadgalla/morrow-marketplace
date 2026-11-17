import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/account-access-forms";
import { AuthPageShell } from "@/components/auth/auth-page-shell";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <AuthPageShell eyebrow="Account security" title="Choose a new password" description="Use at least 10 characters and avoid reusing a password from another service."><ResetPasswordForm token={token} /></AuthPageShell>;
}
