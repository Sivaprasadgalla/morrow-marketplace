"use client";

import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { ColumnDef, DataTable, FilterDef } from "@/components/ui/data-table";
import { useToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";

type AdminOrder = {
  _id: string;
  orderNumber: string;
  totalPaise: number;
  status: string;
  createdAt: string;
  customer?: { name?: string; email?: string };
  items: Array<{
    productName: string;
    vendor?: { name?: string; vendorProfile?: { storeName?: string } };
  }>;
};

const ORDER_STATUS_OPTIONS = [
  { label: "Awaiting payment", value: "awaiting_payment" },
  { label: "Paid", value: "paid" },
  { label: "Processing", value: "processing" },
  { label: "Shipped", value: "shipped" },
  { label: "Delivered", value: "delivered" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Refunded", value: "refunded" },
];

export function AdminOrders() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/admin/orders")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load live orders.");
        return response.json() as Promise<{ orders: AdminOrder[] }>;
      })
      .then((payload) => {
        setOrders(payload.orders);
        setLoading(false);
      })
      .catch((reason: unknown) => {
        const msg = reason instanceof Error ? reason.message : "Unable to load live orders.";
        setError(msg);
        toast.error(msg);
        setLoading(false);
      });
  }, [toast]);

  const columns: ColumnDef<AdminOrder>[] = useMemo(
    () => [
      {
        id: "orderNumber",
        header: "Order",
        accessorKey: "orderNumber",
        cell: ({ row }) => <span className="font-semibold text-stone-900">#{row.orderNumber}</span>,
      },
      {
        id: "customer",
        header: "Customer",
        accessorFn: (row) => row.customer?.name ?? "Customer",
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-stone-900">{row.customer?.name ?? "Customer"}</p>
            <p className="mt-0.5 text-[11px] text-stone-500">{row.customer?.email}</p>
          </div>
        ),
      },
      {
        id: "vendors",
        header: "Vendors",
        accessorFn: (row) =>
          [...new Set(row.items.map((item) => item.vendor?.vendorProfile?.storeName ?? item.vendor?.name ?? "Vendor"))].join(", "),
        cell: ({ value }) => <span className="text-stone-700">{String(value)}</span>,
      },
      {
        id: "total",
        header: "Total",
        accessorKey: "totalPaise",
        cell: ({ row }) => (
          <span className="font-semibold text-stone-900">{formatCurrency(row.totalPaise / 100)}</span>
        ),
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => <StatusBadge status={row.status} />,
      },
      {
        id: "createdAt",
        header: "Placed",
        accessorFn: (row) => new Date(row.createdAt),
        cell: ({ row }) => (
          <span className="text-stone-500">
            {new Intl.DateTimeFormat("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(row.createdAt))}
          </span>
        ),
      },
    ],
    [],
  );

  const filters: FilterDef<AdminOrder>[] = useMemo(
    () => [
      {
        key: "status",
        label: "Status",
        options: ORDER_STATUS_OPTIONS,
      },
    ],
    [],
  );

  return (
    <div className="mx-auto max-w-[1500px]">
      <div>
        <p className="text-[11px] font-semibold tracking-[.11em] text-[#91412e] uppercase">
          Platform operations
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-.045em] sm:text-4xl">Orders</h1>
        <p className="mt-2 text-sm text-stone-500">
          Monitor payment, fulfilment and customer orders across every vendor.
        </p>
      </div>

      {error ? (
        <p className="mt-5 border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
          {error}
        </p>
      ) : null}

      <div className="mt-7">
        {loading ? (
          <div className="border border-stone-200 bg-[#fcfaf6] p-12 text-center text-sm text-stone-500">
            Loading orders...
          </div>
        ) : (
          <DataTable
            data={orders}
            columns={columns}
            filters={filters}
            searchPlaceholder="Search order #, customer, email, or vendor..."
            searchFilter={(order, query) => {
              const customerName = order.customer?.name?.toLowerCase() ?? "";
              const customerEmail = order.customer?.email?.toLowerCase() ?? "";
              const orderNumber = order.orderNumber.toLowerCase();
              const vendorNames = order.items
                .map((i) => i.vendor?.vendorProfile?.storeName ?? i.vendor?.name ?? "")
                .join(" ")
                .toLowerCase();
              const productNames = order.items.map((i) => i.productName).join(" ").toLowerCase();

              return (
                orderNumber.includes(query) ||
                customerName.includes(query) ||
                customerEmail.includes(query) ||
                vendorNames.includes(query) ||
                productNames.includes(query)
              );
            }}
            defaultPageSize={10}
            emptyMessage="No matching orders found."
            rowKey={(order) => order._id}
          />
        )}
      </div>
    </div>
  );
}
