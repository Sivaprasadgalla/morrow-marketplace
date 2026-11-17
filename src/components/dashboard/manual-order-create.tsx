"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, LoaderCircle, Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { formatApiErrorMessage } from "@/lib/utils";

type Product = {
  _id: string;
  name: string;
  variants: Array<{
    _id: string;
    name: string;
    sku: string;
    stock: number;
    pricePaise: number;
  }>;
};

export function ManualOrderCreate() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || products.length) return;
    void fetch("/api/products?scope=mine&limit=48")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load your products.");
        return response.json() as Promise<{ items: Product[] }>;
      })
      .then((payload) => {
        setProducts(payload.items);
        setProductId(payload.items[0]?._id ?? "");
      })
      .catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : "Unable to load your products.");
      });
  }, [open, products.length, toast]);

  const product = useMemo(
    () => products.find((item) => item._id === productId),
    [productId, products],
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      const invalid = form.querySelector<HTMLInputElement | HTMLSelectElement>(":invalid");
      const label =
        invalid?.closest("label")?.querySelector("span")?.textContent?.replace(/\(.*\)/, "").trim() ||
        invalid?.name ||
        "Field";
      const message = invalid?.validationMessage || "Please fill in this field correctly.";
      const errText = `${label}: ${message}`;
      setError(errText);
      toast.error(errText, "Validation Error");
      invalid?.focus();
      return;
    }
    if (!product?.variants[0]) {
      const msg = "Add an active product with a variant before creating a manual order.";
      setError(msg);
      toast.error(msg, "Action Required");
      return;
    }
    setBusy(true);
    const formData = new FormData(form);
    try {
      const response = await fetch("/api/vendor/manual-orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerEmail: formData.get("customerEmail"),
          productId,
          variantId: formData.get("variantId"),
          quantity: Number(formData.get("quantity")),
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
      const result = (await response.json()) as {
        order?: { orderNumber: string };
        emailSent?: boolean;
        error?: string;
        details?: unknown;
      };
      if (!response.ok || !result.order) {
        throw new Error(formatApiErrorMessage(result, "Unable to create manual order."));
      }
      toast.success(
        `Invoice #${result.order.orderNumber} created. ${
          result.emailSent
            ? "A secure payment email was sent to customer."
            : "The customer can pay from their account."
        }`,
      );
      setOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to create manual order.";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Manual order
      </Button>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="manual-order-drawer"
            className="fixed inset-0 z-[80] flex justify-end"
            role="dialog"
            aria-modal="true"
            aria-label="Create manual order"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.button
              type="button"
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
              aria-label="Close manual order form"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="relative h-full w-full max-w-xl overflow-y-auto bg-[#fbf7ef] p-6 shadow-2xl sm:p-8"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-semibold tracking-[.12em] text-[#5f6048] uppercase">
                    Vendor invoice
                  </p>
                  <h2 className="mt-2 font-serif text-4xl">Create manual order</h2>
                  <p className="mt-3 max-w-md text-sm leading-6 text-stone-500">
                    Choose one of your products for an existing verified customer. The customer
                    receives a secure payment request and the order stays unpaid until Razorpay
                    confirms payment.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid size-10 place-items-center rounded-full hover:bg-stone-200"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>

              {error && (
                <div className="mt-6 border border-red-200 bg-red-50 p-3.5 text-xs text-red-800">
                  {error}
                </div>
              )}

              <form noValidate onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2 block">
                  <span className="mb-2 block text-xs font-medium">Customer account email</span>
                  <Input
                    name="customerEmail"
                    type="email"
                    required
                    placeholder="Customer’s verified Morrow email"
                  />
                </label>
                <label className="sm:col-span-2 block">
                  <span className="mb-2 block text-xs font-medium">Your product</span>
                  <select
                    value={productId}
                    onChange={(event) => setProductId(event.target.value)}
                    className="h-11 w-full cursor-pointer border border-stone-300 bg-white px-3 text-sm"
                    required
                  >
                    <option value="" disabled>
                      Select a product
                    </option>
                    {products.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-medium">Variant</span>
                  <select
                    name="variantId"
                    className="h-11 w-full cursor-pointer border border-stone-300 bg-white px-3 text-sm"
                    required
                  >
                    {product?.variants.map((variant) => (
                      <option key={variant._id} value={variant._id} disabled={variant.stock < 1}>
                        {variant.name} · {variant.stock} in stock
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-medium">Quantity</span>
                  <Input
                    name="quantity"
                    type="number"
                    min="1"
                    max={product?.variants[0]?.stock ?? 1}
                    defaultValue="1"
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-medium">Recipient name</span>
                  <Input name="name" required />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-medium">Phone</span>
                  <Input name="phone" required />
                </label>
                <label className="sm:col-span-2 block">
                  <span className="mb-2 block text-xs font-medium">Address</span>
                  <Input name="line1" required />
                </label>
                <label className="sm:col-span-2 block">
                  <span className="mb-2 block text-xs font-medium">Landmark / apartment</span>
                  <Input name="line2" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-medium">City</span>
                  <Input name="city" required />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-medium">State</span>
                  <Input name="state" required />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-medium">PIN code</span>
                  <Input name="postalCode" required />
                </label>
                <p className="self-end pb-3 text-xs text-stone-500">India</p>
                <Button
                  type="submit"
                  className="sm:col-span-2"
                  size="lg"
                  disabled={busy || !products.length}
                >
                  {busy ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  Create invoice
                </Button>
              </form>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
