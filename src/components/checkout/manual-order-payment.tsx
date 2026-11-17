"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, LoaderCircle, LockKeyhole } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

type Order = { _id: string; orderNumber: string; totalPaise: number; status: string; payment?: { status?: string }; items: Array<{ productName: string; quantity: number }> };
type RazorpaySuccess = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };

export function ManualOrderPayment({ orderId }: { orderId: string }) {
  const { data: session, status } = useSession(); const router = useRouter(); const [order, setOrder] = useState<Order | null>(null); const [error, setError] = useState(""); const [paying, setPaying] = useState(false); const [complete, setComplete] = useState(false);
  useEffect(() => { if (!session) return; void fetch(`/api/orders/${orderId}`).then(async (response) => { if (!response.ok) throw new Error("This payment request is unavailable."); return response.json() as Promise<{ order: Order }>; }).then((payload) => setOrder(payload.order)).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "This payment request is unavailable.")); }, [orderId, session]);
  async function pay() {
    if (!order) return; setPaying(true); setError("");
    try {
      const paymentResponse = await fetch("/api/payments/create-order", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ internalOrderId: order._id }) });
      const payment = await paymentResponse.json(); if (!paymentResponse.ok) throw new Error(payment.error ?? "Unable to initialise payment.");
      if (payment.demo) throw new Error("Payment configuration is unavailable.");
      await loadRazorpay(); const response = await openRazorpay({ key: payment.keyId, amount: payment.amount, currency: payment.currency, orderId: payment.providerOrderId, name: session?.user.name ?? "", email: session?.user.email ?? "" });
      const verificationResponse = await fetch("/api/payments/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(response) }); const verification = await verificationResponse.json(); if (!verificationResponse.ok) throw new Error(verification.error ?? "Payment verification is pending."); setComplete(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to complete payment."); } finally { setPaying(false); }
  }
  if (status === "loading") return <div className="grid min-h-[60vh] place-items-center"><LoaderCircle className="size-6 animate-spin" /></div>;
  if (!session) return <div className="grid min-h-[60vh] place-items-center px-5 text-center"><div><h1 className="font-serif text-5xl">Sign in to pay</h1><p className="mt-3 text-sm text-stone-500">Use the customer account that received this order.</p><Link href={`/login?callbackUrl=${encodeURIComponent(`/pay/${orderId}`)}`} className="mt-6 inline-flex h-11 items-center bg-[#211f1a] px-6 text-sm text-white">Sign in securely</Link></div></div>;
  if (complete) return <div className="grid min-h-[60vh] place-items-center px-5 text-center"><div><CheckCircle2 className="mx-auto size-12 text-emerald-700" /><h1 className="mt-5 font-serif text-5xl">Payment confirmed.</h1><Button className="mt-7" onClick={() => router.push("/account")}>View my order</Button></div></div>;
  if (error && !order) return <div className="grid min-h-[60vh] place-items-center px-5 text-center"><div><h1 className="font-serif text-5xl">Payment unavailable</h1><p className="mt-4 text-sm text-red-700">{error}</p></div></div>;
  if (!order) return <div className="grid min-h-[60vh] place-items-center"><LoaderCircle className="size-6 animate-spin" /></div>;
  if (order.payment?.status === "captured" || order.status !== "awaiting_payment") return <div className="grid min-h-[60vh] place-items-center px-5 text-center"><div><CheckCircle2 className="mx-auto size-12 text-emerald-700" /><h1 className="mt-5 font-serif text-5xl">This order is already paid.</h1><Link href="/account" className="mt-7 inline-block border-b border-stone-950 pb-1 text-sm font-semibold">View my orders</Link></div></div>;
  return <main className="mx-auto max-w-xl px-5 py-20"><p className="text-[11px] font-semibold tracking-[.14em] text-[#91412e] uppercase">Secure payment</p><h1 className="mt-4 font-serif text-5xl tracking-[-.05em]">Complete your order.</h1><section className="mt-10 border border-stone-200 bg-[#fcfaf6] p-6"><p className="text-sm font-semibold">{order.orderNumber}</p><div className="mt-5 space-y-3 text-sm">{order.items.map((item) => <p key={item.productName}>{item.productName} <span className="text-stone-500">× {item.quantity}</span></p>)}</div><div className="mt-6 flex items-center justify-between border-t border-stone-200 pt-5"><span className="text-sm text-stone-500">Total</span><strong className="font-serif text-3xl">{formatCurrency(order.totalPaise / 100)}</strong></div>{error ? <p className="mt-4 text-xs text-red-700">{error}</p> : null}<Button size="lg" className="mt-6 w-full" disabled={paying} onClick={() => void pay()}>{paying ? <LoaderCircle className="size-4 animate-spin" /> : <LockKeyhole className="size-4" />}{paying ? "Opening secure payment…" : `Pay ${formatCurrency(order.totalPaise / 100)}`}</Button></section></main>;
}

function loadRazorpay() { if (window.Razorpay) return Promise.resolve(); return new Promise<void>((resolve, reject) => { const script = document.createElement("script"); script.src = "https://checkout.razorpay.com/v1/checkout.js"; script.onload = () => resolve(); script.onerror = () => reject(new Error("Unable to load secure checkout.")); document.head.appendChild(script); }); }
function openRazorpay(input: { key: string; amount: number; currency: string; orderId: string; name: string; email: string }) { return new Promise<RazorpaySuccess>((resolve, reject) => { if (!window.Razorpay) return reject(new Error("Secure checkout is unavailable.")); const checkout = new window.Razorpay({ key: input.key, amount: input.amount, currency: input.currency, name: "Morrow", description: "Manual marketplace order", order_id: input.orderId, prefill: { name: input.name, email: input.email, contact: "" }, theme: { color: "#9f3f2a" }, handler: resolve, modal: { ondismiss: () => reject(new Error("Payment was cancelled.")) } }); checkout.open(); }); }
