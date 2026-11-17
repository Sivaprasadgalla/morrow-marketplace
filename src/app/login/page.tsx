import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const session = await auth();
  if (session?.user.role === "admin") redirect("/admin");
  if (session?.user.role === "vendor") redirect("/vendor");
  if (session?.user) redirect("/account");
  const { callbackUrl } = await searchParams;
  return <LoginForm googleEnabled={Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)} callbackUrl={callbackUrl} />;
}
