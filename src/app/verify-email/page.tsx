import type { Metadata } from "next";
import { VerifyEmailStatus } from "@/components/auth/account-access-forms";
import { AuthPageShell } from "@/components/auth/auth-page-shell";

export const metadata: Metadata = { title: "Verify email" };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <AuthPageShell eyebrow="One final step" title="Verify your email" description="We’re confirming that this email address belongs to you."><VerifyEmailStatus token={token} /></AuthPageShell>;
}
