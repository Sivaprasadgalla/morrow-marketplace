"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  LoaderCircle,
  LockKeyhole,
  Package,
  ShoppingBag,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FullPageLoader } from "@/components/ui/full-page-loader";
import { useToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";

type OrderItem = {
  _id: string;
  productName: string;
  variantName: string;
  sku: string;
  image?: string;
  productType?: "physical" | "digital" | "service";
  requiresShipping?: boolean;
  quantity: number;
  unitPricePaise: number;
  lineTotalPaise: number;
  fulfilmentStatus: string;
};

type ShippingAddress = {
  name?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

type OrderData = {
  _id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  totalPaise: number;
  subtotalPaise: number;
  taxPaise: number;
  shippingPaise: number;
  shippingAddress?: ShippingAddress;
  items: OrderItem[];
  payment?: {
    status?: string;
    method?: string;
  };
};

type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

function loadRazorpay() {
  if (typeof window !== "undefined" && window.Razorpay) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load secure payment gateway."));
    document.head.appendChild(script);
  });
}

function openRazorpayModal(input: {
  key: string;
  amount: number;
  currency: string;
  orderId: string;
  name: string;
  email: string;
  phone: string;
}) {
  return new Promise<RazorpaySuccess>((resolve, reject) => {
    if (typeof window === "undefined" || !window.Razorpay) {
      return reject(new Error("Payment gateway is unavailable."));
    }
    const checkout = new window.Razorpay({
      key: input.key,
      amount: input.amount,
      currency: input.currency,
      name: "Morrow",
      description: "Marketplace Order Payment",
      order_id: input.orderId,
      prefill: {
        name: input.name,
        email: input.email,
        contact: input.phone,
      },
      theme: { color: "#9f3f2a" },
      handler: (response: RazorpaySuccess) => resolve(response),
      modal: {
        ondismiss: () => reject(new Error("Payment window was closed.")),
      },
    });
    checkout.on("payment.failed", () =>
      reject(new Error("Payment failed. You can retry anytime.")),
    );
    checkout.open();
  });
}

export function OrderPlacedView({ orderIdentifier }: { orderIdentifier: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Full page loader state for payments
  const [fullLoaderOpen, setFullLoaderOpen] = useState(false);
  const [fullLoaderMessage, setFullLoaderMessage] = useState("");
  const [fullLoaderSubtext, setFullLoaderSubtext] = useState("");

  const reloadOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderIdentifier)}`);
      const payload = (await res.json()) as { order?: OrderData; error?: string };
      if (res.ok && payload.order) {
        setOrder(payload.order);
      }
    } catch {
      // Keep existing order state on silent background refresh
    }
  };

  useEffect(() => {
    let ignore = false;
    fetch(`/api/orders/${encodeURIComponent(orderIdentifier)}`)
      .then((res) => res.json())
      .then((payload: { order?: OrderData; error?: string }) => {
        if (ignore) return;
        if (!payload.order) {
          setError(payload.error ?? "Order details could not be retrieved.");
        } else {
          setOrder(payload.order);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (ignore) return;
        setError(err instanceof Error ? err.message : "Unable to load order details.");
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [orderIdentifier]);

  // Handle immediate payment retry if order is awaiting payment
  const handlePayNow = async () => {
    if (!order) return;
    setFullLoaderOpen(true);
    setFullLoaderMessage("Connecting to secure payment gateway…");
    setFullLoaderSubtext("Preparing your invoice for payment…");

    try {
      const paymentResponse = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ internalOrderId: order._id }),
      });
      const payment = await paymentResponse.json();
      if (!paymentResponse.ok) throw new Error(payment.error ?? "Unable to initialise payment.");

      if (payment.demo) {
        setFullLoaderMessage("Verifying demo payment…");
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
        toast.success("Payment confirmed!");
        await reloadOrder();
        setFullLoaderOpen(false);
        return;
      }

      await loadRazorpay();
      setFullLoaderOpen(false); // Hide overlay while user interacts with Razorpay modal

      const response = await openRazorpayModal({
        key: payment.keyId,
        amount: payment.amount,
        currency: payment.currency,
        orderId: payment.providerOrderId,
        name: order.shippingAddress?.name ?? "",
        email: "",
        phone: order.shippingAddress?.phone ?? "",
      });

      // User completed payment in modal -> show verification loader
      setFullLoaderOpen(true);
      setFullLoaderMessage("Verifying payment with bank…");
      setFullLoaderSubtext("Confirming transaction details…");

      const verifyResponse = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(response),
      });
      const verification = await verifyResponse.json();
      if (!verifyResponse.ok) throw new Error(verification.error ?? "Payment verification is pending.");

      setFullLoaderMessage("Payment confirmed! Updating order…");
      toast.success("Payment received successfully!");
      await reloadOrder();
    } catch (payError) {
      const msg = payError instanceof Error ? payError.message : "Payment was not completed.";
      toast.error(msg);
      setError(msg);
    } finally {
      setFullLoaderOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center bg-[#f6f1e8] px-5 py-20">
        <div className="text-center">
          <LoaderCircle className="mx-auto size-8 animate-spin text-[#91412e]" />
          <p className="mt-4 font-serif text-xl text-stone-700">Loading order receipt…</p>
        </div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="grid min-h-[60vh] place-items-center bg-[#f6f1e8] px-5 py-20 text-center">
        <div className="max-w-md">
          <AlertTriangle className="mx-auto size-10 text-amber-700" />
          <h1 className="mt-4 font-serif text-4xl text-stone-900">Order Not Found</h1>
          <p className="mt-2 text-sm text-stone-600">{error}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={() => router.push("/account")}>View Account Orders</Button>
            <Button variant="outline" onClick={() => router.push("/shop")}>
              Continue Shopping
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const isPaid = ["paid", "processing", "partially_shipped", "shipped", "delivered"].includes(
    order.status,
  );
  const isAwaitingPayment = order.status === "awaiting_payment";

  return (
    <>
      <FullPageLoader
        open={fullLoaderOpen}
        title="Processing Payment"
        message={fullLoaderMessage}
        subtext={fullLoaderSubtext}
      />

      <main className="min-h-screen bg-[#f6f1e8] px-5 py-12 sm:px-8 lg:px-16 lg:py-20">
        <div className="mx-auto max-w-4xl">
          {/* Header Status Banner */}
          <div className="border border-stone-300 bg-[#fcfaf6] p-6 sm:p-10 shadow-sm">
            <div className="flex flex-col items-center text-center">
              {isPaid ? (
                <>
                  <span className="grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="size-8" />
                  </span>
                  <p className="mt-6 text-[11px] font-semibold tracking-[.14em] text-emerald-800 uppercase">
                    Order confirmed
                  </p>
                  <h1 className="mt-2 font-serif text-4xl tracking-tight text-stone-900 sm:text-5xl">
                    Thank you for your order.
                  </h1>
                  <p className="mt-3 max-w-lg text-sm leading-relaxed text-stone-600">
                    Your order <strong>#{order.orderNumber}</strong> has been placed and confirmed.
                    The independent makers have received your pieces and are preparing dispatch.
                  </p>
                </>
              ) : isAwaitingPayment ? (
                <>
                  <span className="grid size-16 place-items-center rounded-full bg-amber-100 text-amber-800">
                    <Clock className="size-8" />
                  </span>
                  <p className="mt-6 text-[11px] font-semibold tracking-[.14em] text-amber-800 uppercase">
                    Awaiting Payment
                  </p>
                  <h1 className="mt-2 font-serif text-4xl tracking-tight text-stone-900 sm:text-5xl">
                    Order placed & reserved.
                  </h1>
                  <p className="mt-3 max-w-lg text-sm leading-relaxed text-stone-600">
                    Order <strong>#{order.orderNumber}</strong> is saved to your account and inventory
                    is reserved. You can pay now below, or complete payment anytime from your Account page.
                  </p>

                  <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                    <Button
                      size="lg"
                      onClick={handlePayNow}
                      className="bg-[#211f1a] text-white hover:bg-[#36322b]"
                    >
                      <LockKeyhole className="size-4" /> Pay {formatCurrency(order.totalPaise / 100)} Now
                    </Button>
                    <Link
                      href="/account"
                      className="inline-flex h-11 items-center border border-stone-300 bg-white px-5 text-sm font-medium text-stone-700 hover:bg-stone-50"
                    >
                      Pay Later in Account
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <span className="grid size-16 place-items-center rounded-full bg-stone-200 text-stone-700">
                    <Package className="size-8" />
                  </span>
                  <p className="mt-6 text-[11px] font-semibold tracking-[.14em] text-stone-600 uppercase">
                    Status: {order.status}
                  </p>
                  <h1 className="mt-2 font-serif text-4xl tracking-tight text-stone-900">
                    Order #{order.orderNumber}
                  </h1>
                </>
              )}
            </div>

            {/* Quick Metadata Grid */}
            <div className="mt-10 grid gap-4 border-t border-stone-200 pt-8 sm:grid-cols-4 text-xs">
              <div>
                <p className="text-stone-500 uppercase tracking-wider text-[10px] font-medium">Order number</p>
                <p className="mt-1 font-semibold text-stone-900">#{order.orderNumber}</p>
              </div>
              <div>
                <p className="text-stone-500 uppercase tracking-wider text-[10px] font-medium">Date placed</p>
                <p className="mt-1 font-medium text-stone-900">
                  {new Intl.DateTimeFormat("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }).format(new Date(order.createdAt))}
                </p>
              </div>
              <div>
                <p className="text-stone-500 uppercase tracking-wider text-[10px] font-medium">Payment status</p>
                <p className="mt-1 font-semibold capitalize text-stone-900">
                  {order.payment?.status ?? (isPaid ? "Paid" : "Awaiting payment")}
                </p>
              </div>
              <div>
                <p className="text-stone-500 uppercase tracking-wider text-[10px] font-medium">Fulfillment</p>
                <p className="mt-1 font-semibold capitalize text-stone-900">{order.status}</p>
              </div>
            </div>
          </div>

          {/* Details Columns: Items & Delivery Address */}
          <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
            {/* Items List */}
            <section className="border border-stone-300 bg-[#fcfaf6] p-6 shadow-sm">
              <h2 className="font-serif text-2xl text-stone-900">Ordered Pieces</h2>
              <div className="mt-6 divide-y divide-stone-200">
                {order.items.map((item) => (
                  <div key={item._id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="relative size-16 shrink-0 overflow-hidden border border-stone-200 bg-stone-100">
                      {item.image ? (
                        <Image src={item.image} alt={item.productName} fill sizes="64px" className="object-cover" />
                      ) : (
                        <span className="grid size-full place-items-center text-stone-400">
                          <ShoppingBag className="size-5" />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-stone-900">{item.productName}</p>
                      <p className="mt-0.5 text-xs text-stone-500">
                        {item.variantName} · Qty: {item.quantity}
                      </p>
                      <p className="mt-1 text-xs text-stone-600">
                        {formatCurrency(item.unitPricePaise / 100)} each
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-stone-900">
                        {formatCurrency(item.lineTotalPaise / 100)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="mt-8 space-y-2.5 border-t border-stone-200 pt-6 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(order.subtotalPaise / 100)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST</span>
                  <span>{formatCurrency(order.taxPaise / 100)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>
                    {order.shippingPaise === 0
                      ? "Complimentary"
                      : formatCurrency(order.shippingPaise / 100)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-stone-200 pt-3 text-base font-semibold text-stone-900">
                  <span>Total</span>
                  <span className="font-serif text-2xl">{formatCurrency(order.totalPaise / 100)}</span>
                </div>
              </div>
            </section>

            {/* Sidebar: Address & Quick Actions */}
            <div className="space-y-6">
              {order.shippingAddress && (
                <section className="border border-stone-300 bg-[#fcfaf6] p-6 shadow-sm">
                  <h3 className="font-serif text-xl text-stone-900">Delivery Address</h3>
                  <div className="mt-4 text-xs leading-relaxed text-stone-600">
                    <p className="font-semibold text-stone-900">{order.shippingAddress.name}</p>
                    <p className="mt-1">{order.shippingAddress.line1}</p>
                    {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                    <p>
                      {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                    </p>
                    <p>{order.shippingAddress.country}</p>
                    {order.shippingAddress.phone && (
                      <p className="mt-2 text-stone-500">Phone: {order.shippingAddress.phone}</p>
                    )}
                  </div>
                </section>
              )}

              <section className="border border-stone-300 bg-[#fcfaf6] p-6 shadow-sm">
                <h3 className="font-serif text-xl text-stone-900">Next Steps</h3>
                <p className="mt-2 text-xs leading-relaxed text-stone-600">
                  You can track fulfillment updates, download invoices, or complete unpaid orders at any time
                  from your customer dashboard.
                </p>

                <div className="mt-6 flex flex-col gap-2.5">
                  <Link
                    href="/account"
                    className="inline-flex h-10 w-full items-center justify-center gap-2 bg-[#211f1a] text-xs font-medium text-white transition hover:bg-[#36322b]"
                  >
                    View Account Orders <ArrowRight className="size-3.5" />
                  </Link>
                  <Link
                    href="/shop"
                    className="inline-flex h-10 w-full items-center justify-center gap-2 border border-stone-300 bg-white text-xs font-medium text-stone-700 transition hover:bg-stone-50"
                  >
                    <Store className="size-3.5" /> Continue Shopping
                  </Link>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
