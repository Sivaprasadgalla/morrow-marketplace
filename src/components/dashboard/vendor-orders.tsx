"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, LoaderCircle, PackageCheck, RotateCcw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { formatApiErrorMessage, formatCurrency } from "@/lib/utils";
import { ManualOrderCreate } from "@/components/dashboard/manual-order-create";

type FulfilmentStatus =
  | "pending"
  | "accepted"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

type VendorItem = {
  _id: string;
  productName: string;
  variantName: string;
  quantity: number;
  unitPricePaise: number;
  commissionPaise: number;
  vendorPayablePaise: number;
  fulfilmentStatus: FulfilmentStatus;
  trackingNumber?: string;
  productType?: "physical" | "digital" | "service";
  requiresShipping?: boolean;
};

type VendorOrder = {
  _id: string;
  orderNumber: string;
  createdAt: string;
  customer?: { name?: string; email?: string };
  shippingAddress?: {
    name?: string;
    phone?: string;
    line1?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  items: VendorItem[];
};

const statuses: FulfilmentStatus[] = [
  "accepted",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
];

export function VendorOrders() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [workingKey, setWorkingKey] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { status: FulfilmentStatus; trackingNumber: string }>
  >({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    void fetch("/api/vendor/orders")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load live orders.");
        return response.json() as Promise<{ orders: VendorOrder[] }>;
      })
      .then((payload) => setOrders(payload.orders))
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : "Unable to load live orders."),
      );
  }, [toast]);

  const lineCount = useMemo(
    () => orders.reduce((sum, order) => sum + order.items.length, 0),
    [orders],
  );

  function getDraft(item: VendorItem) {
    return (
      drafts[item._id] ?? {
        status: item.fulfilmentStatus,
        trackingNumber: item.trackingNumber ?? "",
      }
    );
  }

  function editDraft(
    item: VendorItem,
    change: Partial<{ status: FulfilmentStatus; trackingNumber: string }>,
  ) {
    setDrafts((current) => ({ ...current, [item._id]: { ...getDraft(item), ...change } }));
  }

  async function save(order: VendorOrder, item: VendorItem) {
    const draft = getDraft(item);
    const key = `${order._id}-${item._id}`;
    if (draft.status === "shipped" && item.requiresShipping !== false && !draft.trackingNumber.trim()) {
      toast.warning("Add a tracking number before marking a physical item as shipped.");
      return;
    }
    setWorkingKey(key);
    const update = (result: VendorItem) =>
      setOrders((current) =>
        current.map((candidate) =>
          candidate._id === order._id
            ? {
                ...candidate,
                items: candidate.items.map((line) => (line._id === item._id ? result : line)),
              }
            : candidate,
        ),
      );
    try {
      const response = await fetch(`/api/orders/${order._id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          itemId: item._id,
          fulfilmentStatus: draft.status,
          trackingNumber: draft.trackingNumber || undefined,
        }),
      });
      const result = (await response.json()) as { order?: VendorOrder; error?: string; details?: unknown };
      if (!response.ok || !result.order)
        throw new Error(formatApiErrorMessage(result, "Unable to update fulfilment."));
      const fresh = result.order.items.find((line) => line._id === item._id);
      if (fresh) update(fresh);
      setDrafts((current) => {
        const next = { ...current };
        delete next[item._id];
        return next;
      });
      toast.success(`Order #${order.orderNumber} updated to ${draft.status}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update fulfilment.");
    } finally {
      setWorkingKey(null);
    }
  }

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        order.orderNumber.toLowerCase().includes(q) ||
        (order.customer?.name ?? "").toLowerCase().includes(q) ||
        (order.customer?.email ?? "").toLowerCase().includes(q) ||
        order.items.some((i) => i.productName.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "all" ||
        order.items.some((i) => i.fulfilmentStatus === statusFilter);

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  const hasActiveFilters = Boolean(search.trim() || statusFilter !== "all");

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[.11em] text-[#5f6048] uppercase">
            Vendor workspace
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-.045em] sm:text-4xl">
            Orders & fulfilment
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            Update only the line items your store owns. Customers receive the status in their
            account.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ManualOrderCreate />
          <p className="inline-flex items-center gap-2 border border-stone-200 bg-[#fcfaf6] px-4 py-2 text-xs font-semibold">
            <PackageCheck className="size-4 text-[#5f6048]" /> {lineCount} order lines
          </p>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="mt-7 flex flex-wrap items-center gap-3 border border-stone-200 bg-[#fcfaf6] p-4">
        <div className="relative min-w-[220px] max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order #, customer, or product..."
            className="h-10 w-full border border-stone-300 bg-white pl-9 pr-8 text-xs text-stone-900 outline-none transition focus:border-stone-500"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 cursor-pointer border border-stone-300 bg-white px-3 text-xs text-stone-700 outline-none hover:border-stone-400"
        >
          <option value="all">All Fulfilment Statuses</option>
          <option value="pending">Pending</option>
          {statuses.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
            }}
            className="inline-flex h-10 items-center gap-1.5 border border-dashed border-stone-300 bg-stone-100/70 px-3 text-xs font-medium text-stone-600 transition hover:bg-stone-200/80 hover:text-stone-900"
          >
            <RotateCcw className="size-3.5" /> Reset
          </button>
        )}

        <div className="ml-auto text-xs text-stone-500">
          Showing <span className="font-semibold text-stone-900">{filteredOrders.length}</span> of{" "}
          <span className="font-semibold text-stone-900">{orders.length}</span> orders
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {filteredOrders.map((order) => (
          <section
            key={order._id}
            className="overflow-hidden border border-stone-200 bg-[#fcfaf6] shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-200 px-5 py-4">
              <div>
                <p className="font-semibold">#{order.orderNumber}</p>
                <p className="mt-1 text-xs text-stone-500">
                  {order.customer?.name ?? "Customer"} · {order.customer?.email ?? ""} ·{" "}
                  {new Intl.DateTimeFormat("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }).format(new Date(order.createdAt))}
                </p>
              </div>
              {order.shippingAddress ? (
                <address className="not-italic text-right text-[11px] leading-relaxed text-stone-500">
                  {order.shippingAddress.name} · {order.shippingAddress.phone}
                  <br />
                  {order.shippingAddress.line1}, {order.shippingAddress.city}
                  <br />
                  {order.shippingAddress.state} {order.shippingAddress.postalCode}
                </address>
              ) : (
                <span className="text-xs text-stone-500">No shipping address required</span>
              )}
            </div>
            <div className="divide-y divide-stone-100">
              {order.items.map((item) => {
                const draft = getDraft(item);
                const key = `${order._id}-${item._id}`;
                return (
                  <div
                    key={item._id}
                    className="grid gap-4 px-5 py-5 lg:grid-cols-[1.2fr_.8fr_.95fr_auto]"
                  >
                    <div>
                      <p className="font-semibold">{item.productName}</p>
                      <p className="mt-1 text-xs text-stone-500">
                        {item.variantName} · {item.quantity} unit
                        {item.quantity === 1 ? "" : "s"} · {item.productType ?? "physical"}
                      </p>
                      <p className="mt-2 text-[11px] text-stone-500">
                        Sale {formatCurrency((item.unitPricePaise * item.quantity) / 100)} ·
                        Commission {formatCurrency(item.commissionPaise / 100)} · Your revenue{" "}
                        <strong className="text-stone-900">
                          {formatCurrency(item.vendorPayablePaise / 100)}
                        </strong>
                      </p>
                    </div>
                    <label className="block">
                      <span className="mb-2 block text-[10px] font-semibold tracking-[.08em] text-stone-500 uppercase">
                        Fulfilment
                      </span>
                      <select
                        value={draft.status}
                        onChange={(event) =>
                          editDraft(item, {
                            status: event.target.value as FulfilmentStatus,
                          })
                        }
                        className="h-10 w-full cursor-pointer border border-stone-300 bg-white px-3 text-xs capitalize"
                      >
                        <option value="pending" disabled>
                          Pending
                        </option>
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-[10px] font-semibold tracking-[.08em] text-stone-500 uppercase">
                        {item.requiresShipping === false
                          ? "Delivery reference"
                          : "Tracking number"}
                      </span>
                      <Input
                        value={draft.trackingNumber}
                        onChange={(event) =>
                          editDraft(item, { trackingNumber: event.target.value })
                        }
                        placeholder={
                          item.requiresShipping === false
                            ? "Access or appointment ref."
                            : "e.g. DLV-986552"
                        }
                        className="h-10 text-xs"
                      />
                    </label>
                    <Button
                      size="sm"
                      className="self-end"
                      disabled={workingKey === key}
                      onClick={() => void save(order, item)}
                    >
                      {workingKey === key ? (
                        <LoaderCircle className="size-3 animate-spin" />
                      ) : (
                        <Check className="size-3" />
                      )}
                      Save
                    </Button>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <p className="mt-4 border border-stone-200 bg-[#fcfaf6] p-12 text-center text-sm text-stone-500">
          {orders.length === 0
            ? "No paid orders need fulfilment yet."
            : "No orders match your search and filter criteria."}
        </p>
      ) : null}
    </div>
  );
}
