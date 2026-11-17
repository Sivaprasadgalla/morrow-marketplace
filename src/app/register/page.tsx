import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/account-access-forms";
import { AuthPageShell } from "@/components/auth/auth-page-shell";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return <AuthPageShell eyebrow="Join the marketplace" title="Create your account" description="Shop independent collections or apply to open your own maker storefront."><RegisterForm /></AuthPageShell>;
}
