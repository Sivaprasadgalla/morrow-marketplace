"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Check, LoaderCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColumnDef, DataTable, FilterDef } from "@/components/ui/data-table";
import { ConfirmDialog, PromptDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { formatApiErrorMessage, formatCurrency } from "@/lib/utils";

type Status = "draft" | "submitted" | "active" | "rejected" | "archived";
type Listing = {
  _id: string;
  name: string;
  maker: string;
  category: string;
  status: Status;
  images: string[];
  variants: Array<{ stock: number; pricePaise: number }>;
  productType?: "physical" | "digital" | "service";
  vendor?: { name?: string; email?: string; vendorProfile?: { storeName?: string } };
  moderation?: { note?: string };
};

const STATUS_OPTIONS = [
  { label: "Submitted (Pending review)", value: "submitted" },
  { label: "Active", value: "active" },
  { label: "Draft", value: "draft" },
  { label: "Rejected", value: "rejected" },
  { label: "Archived", value: "archived" },
];

const TYPE_OPTIONS = [
  { label: "Physical", value: "physical" },
  { label: "Digital", value: "digital" },
  { label: "Service", value: "service" },
];

export function ProductModeration({ mode }: { mode: "moderation" | "catalogue" }) {
  const { toast } = useToast();
  const [listings, setListings] = useState<Listing[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Listing | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const status = mode === "moderation" ? "submitted" : "";
    void fetch(`/api/admin/products${status ? `?status=${status}` : ""}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load the live catalogue.");
        return response.json() as Promise<{ products: Listing[] }>;
      })
      .then((payload) => {
        setListings(payload.products);
        setLoading(false);
      })
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "Unable to load the live catalogue.");
        setLoading(false);
      });
  }, [mode, toast]);

  const executeReview = useCallback(
    async (listing: Listing, action: "approve" | "reject" | "archive", note?: string) => {
      setBusyId(listing._id);
      try {
        const response = await fetch("/api/admin/products", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ productId: listing._id, action, note }),
        });
        const result = (await response.json()) as { product?: Listing; error?: string; details?: unknown };
        if (!response.ok || !result.product)
          throw new Error(formatApiErrorMessage(result, "Unable to review product."));
        setListings((current) =>
          mode === "moderation"
            ? current.filter((item) => item._id !== listing._id)
            : current.map((item) => (item._id === listing._id ? result.product! : item)),
        );
        toast.success(
          `Product ${
            action === "approve"
              ? "approved and published."
              : action === "reject"
                ? "returned to vendor with revision note."
                : "archived."
          }`,
        );
        setRejectTarget(null);
        setArchiveTarget(null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to review product.");
      } finally {
        setBusyId(null);
      }
    },
    [mode, toast],
  );

  const columns: ColumnDef<Listing>[] = useMemo(
    () => [
      {
        id: "product",
        header: "Product",
        accessorKey: "name",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            {row.images?.[0] ? (
              <div className="relative size-10 shrink-0 overflow-hidden bg-stone-100 border border-stone-200">
                <Image src={row.images[0]} alt="" fill sizes="40px" className="object-cover" />
              </div>
            ) : null}
            <div>
              <p className="font-semibold text-stone-900">{row.name}</p>
              <p className="mt-0.5 text-[11px] text-stone-500">{row.category}</p>
            </div>
          </div>
        ),
      },
      {
        id: "vendor",
        header: "Vendor",
        accessorFn: (row) =>
          row.vendor?.vendorProfile?.storeName ?? row.vendor?.name ?? row.maker,
        cell: ({ row, value }) => (
          <div>
            <p className="font-medium text-stone-900">{String(value)}</p>
            <p className="mt-0.5 text-[11px] text-stone-500">{row.vendor?.email ?? "No email"}</p>
          </div>
        ),
      },
      {
        id: "productType",
        header: "Type",
        accessorKey: "productType",
        cell: ({ row }) => (
          <span className="capitalize text-stone-700">{row.productType ?? "physical"}</span>
        ),
      },
      {
        id: "price",
        header: "Price",
        accessorFn: (row) => row.variants[0]?.pricePaise ?? 0,
        cell: ({ row }) => (
          <span className="font-medium text-stone-900">
            {formatCurrency((row.variants[0]?.pricePaise ?? 0) / 100)}
          </span>
        ),
      },
      {
        id: "stock",
        header: "Stock",
        accessorFn: (row) => row.variants[0]?.stock ?? 0,
        cell: ({ row }) => (
          <span className="text-stone-700">
            {row.productType === "digital"
              ? "Instant access"
              : `${row.variants[0]?.stock ?? 0} available`}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => (
          <div>
            <span
              className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${
                row.status === "active"
                  ? "bg-emerald-100 text-emerald-800"
                  : row.status === "submitted"
                    ? "bg-amber-100 text-amber-800"
                    : row.status === "rejected"
                      ? "bg-red-100 text-red-800"
                      : "bg-stone-100 text-stone-700"
              }`}
            >
              {row.status}
            </span>
            {row.moderation?.note && (
              <p className="mt-1 max-w-44 text-[10px] text-stone-500">{row.moderation.note}</p>
            )}
          </div>
        ),
      },
      {
        id: "actions",
        header: "Review",
        sortable: false,
        cell: ({ row }) => {
          if (row.status === "submitted") {
            return (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  disabled={busyId === row._id}
                  onClick={() => void executeReview(row, "approve")}
                >
                  {busyId === row._id ? (
                    <LoaderCircle className="size-3 animate-spin" />
                  ) : (
                    <Check className="size-3" />
                  )}
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === row._id}
                  onClick={() => setRejectTarget(row)}
                >
                  <X className="size-3" /> Return
                </Button>
              </div>
            );
          }

          if (row.status === "active") {
            return (
              <button
                type="button"
                disabled={busyId === row._id}
                onClick={() => setArchiveTarget(row)}
                className="font-semibold text-[#91412e] hover:underline"
              >
                Archive
              </button>
            );
          }

          return <span className="text-stone-400">No action</span>;
        },
      },
    ],
    [busyId, executeReview],
  );

  const filters: FilterDef<Listing>[] = useMemo(() => {
    const list: FilterDef<Listing>[] = [
      {
        key: "productType",
        label: "Type",
        options: TYPE_OPTIONS,
      },
    ];

    if (mode !== "moderation") {
      list.push({
        key: "status",
        label: "Status",
        options: STATUS_OPTIONS,
      });
    }

    return list;
  }, [mode]);

  const title = mode === "moderation" ? "Moderation queue" : "Product catalogue";
  const description =
    mode === "moderation"
      ? "Approve compliant vendor products, or return them with clear review notes."
      : "Inspect products, their seller, stock and publishing status across the marketplace.";

  return (
    <div className="mx-auto max-w-[1500px]">
      <div>
        <p className="text-[11px] font-semibold tracking-[.11em] text-[#91412e] uppercase">
          Catalogue operations
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-.045em] sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-stone-500">{description}</p>
      </div>

      <div className="mt-7">
        {loading ? (
          <div className="border border-stone-200 bg-[#fcfaf6] p-12 text-center text-sm text-stone-500">
            Loading catalogue...
          </div>
        ) : (
          <DataTable
            data={listings}
            columns={columns}
            filters={filters}
            searchPlaceholder="Search product, category, or vendor..."
            searchFilter={(item, query) => {
              const name = item.name.toLowerCase();
              const category = item.category.toLowerCase();
              const maker = item.maker.toLowerCase();
              const vendor = (
                item.vendor?.vendorProfile?.storeName ??
                item.vendor?.name ??
                ""
              ).toLowerCase();
              const email = (item.vendor?.email ?? "").toLowerCase();
              return (
                name.includes(query) ||
                category.includes(query) ||
                maker.includes(query) ||
                vendor.includes(query) ||
                email.includes(query)
              );
            }}
            defaultPageSize={10}
            emptyMessage={
              mode === "moderation"
                ? "No products are waiting for review."
                : "No matching products found."
            }
            rowKey={(item) => item._id}
          />
        )}
      </div>

      <PromptDialog
        open={Boolean(rejectTarget)}
        title="Return Product to Vendor"
        description={`Provide guidance for "${rejectTarget?.name}". The vendor will see this note and can make revisions before resubmitting.`}
        inputLabel="Feedback note (optional)"
        inputPlaceholder="e.g. Please clarify dimensions and upload a higher resolution hero photo..."
        confirmLabel="Return to Vendor"
        cancelLabel="Cancel"
        busy={Boolean(busyId)}
        onConfirm={async (note) => {
          if (rejectTarget) await executeReview(rejectTarget, "reject", note || undefined);
        }}
        onClose={() => setRejectTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="Archive Listing"
        description={`Are you sure you want to archive "${archiveTarget?.name}"? It will be removed from the active marketplace catalogue.`}
        confirmLabel="Archive Product"
        cancelLabel="Keep Listing"
        variant="danger"
        busy={Boolean(busyId)}
        onConfirm={async () => {
          if (archiveTarget) await executeReview(archiveTarget, "archive");
        }}
        onClose={() => setArchiveTarget(null)}
      />
    </div>
  );
}
