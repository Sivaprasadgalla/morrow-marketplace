import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/login-form";
import { safeCallbackPath } from "@/lib/auth-redirect";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const session = await auth();
  const { callbackUrl } = await searchParams;
  const destination = safeCallbackPath(callbackUrl);
  if (session?.user && destination) redirect(destination);
  if (session?.user.role === "admin") redirect("/admin");
  if (session?.user.role === "vendor") redirect("/vendor");
  if (session?.user) redirect("/account");
  return <LoginForm googleEnabled={Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)} callbackUrl={destination} />;
}
