"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";

type ApiResult = { message?: string; error?: string; verificationUrl?: string; resetUrl?: string };

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const result = (await response.json()) as ApiResult;
  if (!response.ok) throw new Error(result.error ?? "Something went wrong. Please try again.");
  return result;
}

export function RegisterForm() {
  const [accountType, setAccountType] = useState<"customer" | "vendor">("customer");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [error, setError] = useState("");

  async function submit(formData: FormData) {
    setLoading(true);
    setError("");
    try {
      const response = await postJson("/api/auth/register", {
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
        accountType,
        storeName: accountType === "vendor" ? formData.get("storeName") : undefined,
      });
      setResult(response);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  if (result) return <SuccessPanel message={result.message ?? "Check your email to continue."} previewUrl={result.verificationUrl} linkLabel="Open development verification link" />;

  return (
    <form action={submit} className="space-y-4">
      <div className="grid grid-cols-2 border border-stone-300 bg-white/50 p-1 text-xs">
        {(["customer", "vendor"] as const).map((type) => <button key={type} type="button" onClick={() => setAccountType(type)} className={`px-4 py-3 capitalize transition ${accountType === type ? "bg-[#211f1a] text-white" : "text-stone-600 hover:text-stone-950"}`}>{type}</button>)}
      </div>
      <Field name="name" label="Full name" autoComplete="name" />
      <Field name="email" label="Email address" type="email" autoComplete="email" />
      {accountType === "vendor" ? <Field name="storeName" label="Store name" autoComplete="organization" /> : null}
      <Field name="password" label="Password" type="password" autoComplete="new-password" minLength={10} helper="At least 10 characters" />
      {error ? <p role="alert" className="text-xs leading-5 text-red-700">{error}</p> : null}
      <Button className="w-full" size="lg" disabled={loading}>{loading ? <LoaderCircle className="size-4 animate-spin" /> : null} Create account</Button>
      <p className="text-center text-xs text-stone-500">Already registered? <Link href="/login" className="font-medium text-stone-950 underline underline-offset-4">Sign in</Link></p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [error, setError] = useState("");
  async function submit(formData: FormData) {
    setLoading(true);
    setError("");
    try {
      setResult(await postJson("/api/auth/forgot-password", { email: formData.get("email") }));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }
  if (result) return <SuccessPanel message={result.message ?? "Check your email for the next step."} previewUrl={result.resetUrl} linkLabel="Open development reset link" />;
  return <form action={submit} className="space-y-4"><Field name="email" label="Email address" type="email" autoComplete="email" />{error ? <p role="alert" className="text-xs text-red-700">{error}</p> : null}<Button className="w-full" size="lg" disabled={loading}>{loading ? <LoaderCircle className="size-4 animate-spin" /> : null} Send reset link</Button></form>;
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");
  async function submit(formData: FormData) {
    const password = String(formData.get("password") ?? "");
    const confirmation = String(formData.get("confirmation") ?? "");
    if (password !== confirmation) return setError("The passwords do not match.");
    setLoading(true);
    setError("");
    try {
      await postJson("/api/auth/reset-password", { token, password });
      setComplete(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Password reset failed.");
    } finally {
      setLoading(false);
    }
  }
  if (!token) return <p className="text-sm text-red-700">This reset link is incomplete. Request a new one from the sign-in page.</p>;
  if (complete) return <SuccessPanel message="Your password has been updated." previewUrl="/login" linkLabel="Sign in with the new password" />;
  return <form action={submit} className="space-y-4"><Field name="password" label="New password" type="password" autoComplete="new-password" minLength={10} /><Field name="confirmation" label="Confirm password" type="password" autoComplete="new-password" minLength={10} />{error ? <p role="alert" className="text-xs text-red-700">{error}</p> : null}<Button className="w-full" size="lg" disabled={loading}>{loading ? <LoaderCircle className="size-4 animate-spin" /> : null} Update password</Button></form>;
}

export function VerifyEmailStatus({ token }: { token: string }) {
  const [status, setStatus] = useState<"loading" | "success" | "error">(token ? "loading" : "error");
  const [message, setMessage] = useState(token ? "Verifying your email address…" : "This verification link is incomplete.");
  useEffect(() => {
    if (!token) return;
    void postJson("/api/auth/verify-email", { token })
      .then((result) => { setStatus("success"); setMessage(result.message ?? "Email verified."); })
      .catch((verifyError: unknown) => { setStatus("error"); setMessage(verifyError instanceof Error ? verifyError.message : "Verification failed."); });
  }, [token]);
  return <div className="border border-stone-300 bg-white/55 p-6 text-center">{status === "loading" ? <LoaderCircle className="mx-auto size-6 animate-spin" /> : <CheckCircle2 className={`mx-auto size-7 ${status === "success" ? "text-emerald-700" : "text-red-700"}`} />}<p className="mt-4 text-sm leading-6 text-stone-600">{message}</p>{status !== "loading" ? <Link href={status === "success" ? "/login" : "/register"} className="mt-5 inline-block text-xs font-medium underline underline-offset-4">{status === "success" ? "Continue to sign in" : "Return to registration"}</Link> : null}</div>;
}

function SuccessPanel({ message, previewUrl, linkLabel }: { message: string; previewUrl?: string; linkLabel: string }) {
  return <div className="border border-stone-300 bg-white/55 p-6 text-center"><CheckCircle2 className="mx-auto size-7 text-emerald-700" /><p className="mt-4 text-sm leading-6 text-stone-600">{message}</p>{previewUrl ? <Link href={previewUrl} className="mt-5 inline-block text-xs font-medium text-[#9f3f2a] underline underline-offset-4">{linkLabel}</Link> : null}</div>;
}

function Field({ name, label, helper, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { name: string; label: string; helper?: string }) {
  const Control = props.type === "password" ? PasswordInput : Input;
  return <label className="block"><span className="mb-2 block text-xs font-medium">{label}</span><Control name={name} required {...props} />{helper ? <span className="mt-1.5 block text-[10px] text-stone-500">{helper}</span> : null}</label>;
}
