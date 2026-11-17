"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LoaderCircle, LockKeyhole } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { FullPageLoader } from "@/components/ui/full-page-loader";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";

type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  handler: (response: RazorpaySuccess) => void;
  modal: { ondismiss: () => void };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
      on: (event: string, callback: () => void) => void;
    };
  }
}

export function CheckoutForm() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const { items, subtotal, clearCart } = useCart();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Global full page loader state
  const [loaderOpen, setLoaderOpen] = useState(false);
  const [loaderTitle, setLoaderTitle] = useState("Securing Order");
  const [loaderMessage, setLoaderMessage] = useState("Reserving your pieces…");
  const [loaderSubtext, setLoaderSubtext] = useState("Checking live inventory with makers…");

  const tax = Math.round(subtotal * 0.18);
  const shipping = subtotal >= 5000 ? 0 : 250;
  const total = subtotal + tax + shipping;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const form = e.currentTarget;
    if (!form.checkValidity()) {
      const invalid = form.querySelector<HTMLInputElement>(":invalid");
      const label =
        invalid?.closest("label")?.querySelector("span")?.textContent?.trim() ||
        invalid?.name ||
        "Field";
      const msg = `${label}: ${invalid?.validationMessage || "Please fill in this field correctly."}`;
      setError(msg);
      toast.error(msg, "Validation Error");
      invalid?.focus();
      return;
    }

    setBusy(true);
    setLoaderOpen(true);
    setLoaderTitle("Securing Order");
    setLoaderMessage("Reserving your pieces & creating invoice…");
    setLoaderSubtext("Checking live inventory with independent makers…");

    const formData = new FormData(form);
    let internalOrderId: string | undefined;
    let createdOrderNumber: string | undefined;
    let paymentSubmitted = false;

    try {
      const orderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.id,
            variantId: item.variantId,
            quantity: item.quantity,
          })),
          shippingAddress: {
            name: formData.get("name"),
            phone: formData.get("phone"),
            line1: formData.get("line1"),
            line2: formData.get("line2") || undefined,
            city: formData.get("city"),
            state: formData.get("state"),
            postalCode: formData.get("postalCode"),
            country: "India",
          },
        }),
      });

      const orderPayload = await orderResponse.json();
      if (!orderResponse.ok || !orderPayload.order) {
        throw new Error(orderPayload.error ?? "Unable to create order.");
      }
      internalOrderId = orderPayload.order._id;
      createdOrderNumber = orderPayload.order.orderNumber;

      setLoaderTitle("Preparing Payment");
      setLoaderMessage("Connecting to secure payment gateway…");

      const paymentResponse = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ internalOrderId }),
      });
      const payment = await paymentResponse.json();
      if (!paymentResponse.ok) throw new Error(payment.error ?? "Unable to initialise payment.");

      if (payment.demo) {
        setLoaderTitle("Verifying Payment");
        setLoaderMessage("Finalizing demo payment & generating receipt…");
        const verifyResponse = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            razorpay_order_id: payment.providerOrderId,
            razorpay_payment_id: `pay_demo_${crypto.randomUUID()}`,
          }),
        });
        const verification = await verifyResponse.json();
        if (!verifyResponse.ok) throw new Error(verification.error ?? "Payment verification failed.");

        clearCart();
        toast.success("Order confirmed!");
        router.push(`/order-placed/${verification.orderNumber}`);
        return;
      }

      await loadRazorpay();
      // Temporarily hide full-page loader so user can interact with the Razorpay modal
      setLoaderOpen(false);

      const response = await openRazorpay({
        key: payment.keyId,
        amount: payment.amount,
        currency: payment.currency,
        orderId: payment.providerOrderId,
        customer: {
          name: String(formData.get("name") ?? session?.user.name ?? ""),
          email: session?.user.email ?? "",
          contact: String(formData.get("phone") ?? ""),
        },
      });

      // User submitted payment successfully -> re-open loader for verification
      paymentSubmitted = true;
      setLoaderOpen(true);
      setLoaderTitle("Verifying Payment");
      setLoaderMessage("Verifying payment with bank & finalizing order…");
      setLoaderSubtext("Please do not refresh or close this window.");

      const verifyResponse = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(response),
      });
      const verification = await verifyResponse.json();
      if (!verifyResponse.ok) throw new Error(verification.error ?? "Payment verification is pending.");

      clearCart();
      toast.success("Order confirmed!");
      router.push(`/order-placed/${verification.orderNumber}`);
    } catch (checkoutError) {
      setLoaderOpen(false);
      setBusy(false);

      if (internalOrderId && createdOrderNumber && !paymentSubmitted) {
        // Order was already safely placed in "awaiting_payment" status in DB.
        // Clear cart so items aren't duplicated and redirect user to the order-placed page
        // where they can pay immediately or later from /account!
        clearCart();
        toast.warning(
          `Order #${createdOrderNumber} was recorded. Complete payment now or later from Account.`,
        );
        router.push(`/order-placed/${createdOrderNumber}`);
        return;
      }

      const msg = checkoutError instanceof Error ? checkoutError.message : "Checkout failed.";
      setError(msg);
      toast.error(msg);
    }
  };

  if (!session) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-5 text-center">
        <div>
          <h1 className="font-serif text-5xl">Sign in to continue</h1>
          <p className="mt-3 text-sm text-stone-500">Your bag is saved on this device.</p>
          <Link
            href="/login?callbackUrl=/checkout"
            className="mt-6 inline-flex h-11 items-center bg-[#211f1a] px-6 text-sm text-white"
          >
            Secure sign in
          </Link>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-5 text-center">
        <div>
          <h1 className="font-serif text-5xl">Your bag is empty</h1>
          <p className="mt-2 text-sm text-stone-500">Add pieces from the collection to proceed.</p>
          <Link
            href="/shop"
            className="mt-6 inline-flex h-11 items-center border border-stone-300 px-6 text-sm hover:bg-stone-100"
          >
            Explore the collection
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <FullPageLoader
        open={loaderOpen}
        title={loaderTitle}
        message={loaderMessage}
        subtext={loaderSubtext}
      />

      <div className="mx-auto grid max-w-[1280px] gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[1fr_430px] lg:px-12 lg:py-20">
        <div>
          <p className="text-[10px] tracking-[.14em] text-stone-500 uppercase">Secure checkout</p>
          <h1 className="mt-3 font-serif text-5xl tracking-[-.045em] sm:text-6xl">
            Where should we send it?
          </h1>

          <form noValidate onSubmit={handleSubmit} className="mt-10 grid gap-5 sm:grid-cols-2">
            <Field name="name" label="Full name" defaultValue={session.user.name ?? ""} />
            <Field name="phone" label="Phone number" placeholder="10-digit mobile number" />
            <div className="sm:col-span-2">
              <Field name="line1" label="Address" placeholder="Street, apartment or house number" />
            </div>
            <div className="sm:col-span-2">
              <Field
                name="line2"
                label="Apartment, suite or landmark"
                required={false}
                placeholder="Optional landmark"
              />
            </div>
            <Field name="city" label="City" />
            <Field name="state" label="State" />
            <Field name="postalCode" label="PIN code" placeholder="6-digit postal code" />
            <div className="flex items-end">
              <p className="pb-3 text-xs text-stone-500">India</p>
            </div>

            {error ? (
              <p role="alert" className="sm:col-span-2 text-xs leading-5 text-red-700">
                {error}
              </p>
            ) : null}

            <div className="sm:col-span-2 mt-3">
              <Button size="lg" type="submit" className="w-full" disabled={busy}>
                {busy ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <LockKeyhole className="size-4" />
                )}
                {busy ? "Securing your order…" : `Pay ${formatCurrency(total)}`}
              </Button>
              <p className="mt-3 text-center text-[10px] leading-5 text-stone-500">
                256-bit encrypted checkout. If payment is delayed or window is closed, your order is
                safely preserved in your Account to pay later.
              </p>
            </div>
          </form>
        </div>

        <aside className="self-start border border-stone-200 bg-[#fbf8f2] p-5 lg:sticky lg:top-28">
          <h2 className="font-serif text-3xl">Order summary</h2>
          <div className="mt-6 space-y-5">
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-[64px_1fr_auto] gap-3">
                <div className="relative aspect-[4/5] overflow-hidden bg-stone-200">
                  <Image src={item.image} alt="" fill sizes="64px" className="object-cover" />
                </div>
                <div>
                  <p className="text-xs font-medium">{item.name}</p>
                  <p className="mt-1 text-[10px] text-stone-500">Qty {item.quantity}</p>
                </div>
                <p className="text-xs">{formatCurrency(item.price * item.quantity)}</p>
              </div>
            ))}
          </div>

          <div className="mt-7 space-y-3 border-t border-stone-200 pt-5 text-xs">
            <div className="flex justify-between">
              <span className="text-stone-500">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">GST</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Shipping</span>
              <span>{shipping ? formatCurrency(shipping) : "Complimentary"}</span>
            </div>
            <div className="flex justify-between border-t border-stone-200 pt-4 font-medium">
              <span>Total</span>
              <span className="font-serif text-2xl">{formatCurrency(total)}</span>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

function Field({
  name,
  label,
  defaultValue,
  required = true,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium">{label}</span>
      <Input name={name} defaultValue={defaultValue} required={required} placeholder={placeholder} />
    </label>
  );
}

function loadRazorpay() {
  if (typeof window !== "undefined" && window.Razorpay) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Unable to load secure checkout.")), {
        once: true,
      });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load secure checkout."));
    document.head.appendChild(script);
  });
}

function openRazorpay(input: {
  key: string;
  amount: number;
  currency: string;
  orderId: string;
  customer: { name: string; email: string; contact: string };
}) {
  return new Promise<RazorpaySuccess>((resolve, reject) => {
    if (typeof window === "undefined" || !window.Razorpay) {
      return reject(new Error("Secure checkout is unavailable."));
    }
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      callback();
    };
    const checkout = new window.Razorpay({
      key: input.key,
      amount: input.amount,
      currency: input.currency,
      name: "Morrow",
      description: "Marketplace order",
      order_id: input.orderId,
      prefill: input.customer,
      theme: { color: "#9f3f2a" },
      handler: (response) => finish(() => resolve(response)),
      modal: {
        ondismiss: () =>
          finish(() =>
            reject(new Error("Payment was cancelled. Your order has been saved to your account.")),
          ),
      },
    });
    checkout.on("payment.failed", () =>
      finish(() =>
        reject(new Error("Payment failed. Your order has been saved to your account to pay later.")),
      ),
    );
    checkout.open();
  });
}
