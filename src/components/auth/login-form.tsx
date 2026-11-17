"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, KeyRound, LoaderCircle } from "lucide-react";
import { getSession, signIn } from "next-auth/react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";

export function LoginForm({ googleEnabled, callbackUrl }: { googleEnabled: boolean; callbackUrl?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  async function login() {
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError("Please enter your email address and password.");
      return;
    }
    setLoading(true);
    setError("");
    const result = await signIn("credentials", { email: cleanEmail, password, redirect: false });
    if (result?.error) {
      setError("Unable to sign in. Verify your email and password, and ensure your account is verified.");
      setLoading(false);
      return;
    }
    const session = await getSession();
    const roleDestination = session?.user.role === "admin" ? "/admin" : session?.user.role === "vendor" ? "/vendor" : "/account";
    const safeCallback = callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : undefined;
    router.push(safeCallback ?? roleDestination);
    router.refresh();
  }
  return <div className="min-h-svh bg-[#f6f1e8] lg:grid lg:grid-cols-[1fr_1.1fr]"><div className="relative hidden min-h-svh overflow-hidden bg-[#5f6048] lg:block"><div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1800&q=90')] bg-cover bg-center" /><div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/20" /><Link href="/" className="absolute left-10 top-9 z-10 font-serif text-4xl tracking-[-0.055em] text-white">Morrow</Link><div className="absolute inset-x-12 bottom-12 z-10 text-white"><p className="max-w-xl font-serif text-5xl leading-[0.96] tracking-[-0.04em]">Beautiful commerce, thoughtful operations.</p><p className="mt-5 max-w-lg text-sm leading-6 text-white/65">One marketplace connecting customers, independent makers and the team that keeps every order moving.</p></div></div><main className="flex min-h-svh items-center px-5 py-10 sm:px-10 lg:px-16 xl:px-24"><div className="mx-auto w-full max-w-xl"><Link href="/" className="mb-12 inline-flex items-center gap-2 text-xs text-stone-500 hover:text-stone-950"><ArrowLeft className="size-3.5" /> Back to the marketplace</Link><motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}><p className="text-[10px] tracking-[0.14em] text-stone-500 uppercase">Welcome back</p><h1 className="mt-3 font-serif text-5xl tracking-[-0.045em] sm:text-6xl">Sign in securely.</h1><p className="mt-4 text-sm leading-6 text-stone-600">Access your customer, vendor, or marketplace administration workspace.</p></motion.div><form onSubmit={(event) => { event.preventDefault(); void login(); }} className="mt-9 space-y-4"><label className="block"><span className="mb-2 block text-xs font-medium">Email address</span><Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required placeholder="you@example.com" /></label><label className="block"><span className="mb-2 flex items-center justify-between text-xs font-medium"><span>Password</span><Link href="/forgot-password" className="font-normal text-stone-500 underline underline-offset-4 hover:text-stone-950">Forgot password?</Link></span><PasswordInput value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required placeholder="Your password" /></label>{error ? <p role="alert" className="text-xs text-red-700">{error}</p> : null}<Button className="w-full" size="lg" disabled={loading}>{loading ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />} Sign in securely</Button></form>{googleEnabled ? <Button variant="outline" size="lg" className="mt-3 w-full" onClick={() => signIn("google", { callbackUrl: callbackUrl ?? "/account" })}><KeyRound className="size-4" /> Continue with Google</Button> : null}<p className="mt-5 text-center text-xs text-stone-500">New to Morrow? <Link href="/register" className="font-medium text-stone-950 underline underline-offset-4">Create an account</Link></p><p className="mt-4 text-center text-[11px] leading-5 text-stone-500">Sessions are encrypted and role permissions are verified again on protected server routes.</p></div></main></div>;
}
