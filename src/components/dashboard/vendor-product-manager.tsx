"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Box, Check, Folder, ImageIcon, LoaderCircle, Pencil, Plus, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { MediaManagerModal } from "@/components/dashboard/media-manager-modal";
import { Button } from "@/components/ui/button";
import { ColumnDef, DataTable, FilterDef } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { formatApiErrorMessage, formatCurrency } from "@/lib/utils";

type ProductType = "physical" | "digital" | "service";
type VendorProduct = {
  _id: string;
  name: string;
  maker: string;
  description: string;
  category: string;
  images: string[];
  productType: ProductType;
  fulfilment?: { requiresShipping?: boolean; deliveryLabel?: string; serviceDurationMinutes?: number };
  materials?: string;
  delivery?: string;
  status: "draft" | "submitted" | "active" | "rejected" | "archived";
  variants: Array<{ _id?: string; name: string; sku: string; pricePaise: number; stock: number; options?: Record<string, string> }>;
};

type ProductTemplate = {
  type: ProductType;
  label: string;
  shortLabel: string;
  description: string;
  category: string;
  deliveryLabel: string;
  delivery: string;
  stockLabel: string;
  defaultStock: number;
  requiresShipping: boolean;
  serviceDurationMinutes?: number;
  Icon: typeof Box;
};

const PRODUCT_TEMPLATES: ProductTemplate[] = [
  {
    type: "physical",
    label: "Physical good",
    shortLabel: "Product",
    description: "For stock-managed items that move through shipping or local delivery.",
    category: "Home & lifestyle",
    deliveryLabel: "Ships in 2-4 business days",
    delivery: "Packed with care and sent with tracking after dispatch.",
    stockLabel: "Available units",
    defaultStock: 10,
    requiresShipping: true,
    Icon: Box,
  },
  {
    type: "digital",
    label: "Digital delivery",
    shortLabel: "Digital",
    description: "For downloads, licences, printable files, and other instant-access goods.",
    category: "Design assets",
    deliveryLabel: "Instant digital access",
    delivery: "Your download link and licence key are available immediately in your account.",
    stockLabel: "Available units",
    defaultStock: 999,
    requiresShipping: false,
    Icon: Box,
  },
  {
    type: "service",
    label: "Bookable studio service",
    shortLabel: "Service",
    description: "For consultations, bespoke production, repairs, or private studio sessions.",
    category: "Studio services",
    deliveryLabel: "Booking confirmation sent by email",
    delivery: "We contact you within 24 hours to align timing, intake, and preparation.",
    stockLabel: "Monthly booking capacity",
    defaultStock: 8,
    requiresShipping: false,
    serviceDurationMinutes: 60,
    Icon: Box,
  },
];

function templateFor(type: ProductType): ProductTemplate {
  return PRODUCT_TEMPLATES.find((candidate) => candidate.type === type) ?? PRODUCT_TEMPLATES[0];
}

const TYPE_OPTIONS = [
  { label: "Physical", value: "physical" },
  { label: "Digital", value: "digital" },
  { label: "Service", value: "service" },
];

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Submitted", value: "submitted" },
  { label: "Draft", value: "draft" },
  { label: "Archived", value: "archived" },
];

const STOCK_OPTIONS = [
  { label: "In Stock (>10)", value: "in_stock" },
  { label: "Low Stock (1-10)", value: "low_stock" },
  { label: "Out of Stock (0)", value: "out_of_stock" },
];

export function VendorProductManager({ inventoryOnly = false }: { inventoryOnly?: boolean }) {
  const { toast } = useToast();
  const [items, setItems] = useState<VendorProduct[]>([]);
  const [editing, setEditing] = useState<VendorProduct | null | "new">(null);
  const [archiveTarget, setArchiveTarget] = useState<VendorProduct | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isStandaloneMediaOpen, setIsStandaloneMediaOpen] = useState(false);

  useEffect(() => {
    void fetch("/api/products?scope=mine&limit=100")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load live products.");
        return response.json() as Promise<{ items: VendorProduct[] }>;
      })
      .then((payload) => {
        setItems(payload.items);
        setLoading(false);
      })
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "Unable to load live products.");
        setLoading(false);
      });
  }, [toast]);

  async function save(formData: FormData) {
    setBusy(true);
    const isNew = editing === "new";
    const current = isNew ? null : editing;
    const variant = current?.variants[0];
    const status = String(formData.get("status") ?? "draft") as VendorProduct["status"];
    const productType = String(formData.get("productType") ?? "physical") as ProductType;
    const requiresShipping = productType === "physical" && formData.get("requiresShipping") === "on";

    const primary = String(formData.get("image") || "").trim();
    let gallery: string[] = [];
    try {
      const parsed = JSON.parse(String(formData.get("galleryImages") || "[]"));
      if (Array.isArray(parsed)) gallery = parsed.filter(Boolean);
    } catch {
      gallery = [];
    }
    const allImages = [primary, ...gallery].filter(Boolean);
    if (allImages.length === 0) {
      toast.error("Please add at least one product image.");
      setBusy(false);
      return;
    }

    const payload = {
      name: formData.get("name"),
      maker: formData.get("maker"),
      description: formData.get("description"),
      category: formData.get("category"),
      productType,
      fulfilment: {
        requiresShipping,
        deliveryLabel: String(formData.get("deliveryLabel") || "") || undefined,
        serviceDurationMinutes:
          productType === "service" && formData.get("serviceDurationMinutes")
            ? Number(formData.get("serviceDurationMinutes"))
            : undefined,
      },
      materials: String(formData.get("materials") || "") || undefined,
      delivery: String(formData.get("delivery") || "") || undefined,
      images: allImages,
      variants: [
        {
          ...(variant?._id ? { _id: variant._id } : {}),
          name: "Standard",
          sku: formData.get("sku"),
          options: {},
          pricePaise: Math.round(Number(formData.get("price")) * 100),
          stock: Number(formData.get("stock")),
        },
      ],
      ...(isNew ? { tags: [], submit: status === "submitted" } : { status }),
    };

    try {
      const response = await fetch(isNew ? "/api/products" : `/api/products/${current?._id}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { product?: VendorProduct; error?: string; details?: unknown };
      if (!response.ok || !result.product) {
        throw new Error(formatApiErrorMessage(result, "Unable to save product."));
      }
      setItems((existing) =>
        isNew
          ? [result.product!, ...existing]
          : existing.map((item) => (item._id === result.product?._id ? result.product! : item)),
      );
      setEditing(null);
      toast.success(isNew ? "Product created and submitted for review." : "Product and inventory updated.");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unable to save product.";
      toast.error(msg);
      throw error;
    } finally {
      setBusy(false);
    }
  }

  async function confirmArchive() {
    if (!archiveTarget) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/products/${archiveTarget._id}`, { method: "DELETE" });
      const result = (await response.json()) as { error?: string; details?: unknown };
      if (!response.ok) {
        throw new Error(formatApiErrorMessage(result, "Unable to archive product."));
      }
      setItems((existing) => existing.filter((item) => item._id !== archiveTarget._id));
      toast.success(`"${archiveTarget.name}" has been archived.`);
      setArchiveTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to archive product.");
    } finally {
      setBusy(false);
    }
  }

  const columns: ColumnDef<VendorProduct>[] = useMemo(
    () => [
      {
        id: "product",
        header: "Product",
        accessorKey: "name",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="relative size-12 shrink-0 overflow-hidden bg-stone-100 border border-stone-200">
              {row.images?.[0] ? (
                <Image src={row.images[0]} alt="" fill sizes="48px" className="object-cover" />
              ) : null}
            </div>
            <div>
              <p className="font-semibold text-stone-900">{row.name}</p>
              <p className="mt-0.5 text-[11px] text-stone-500">{row.category}</p>
            </div>
          </div>
        ),
      },
      {
        id: "productType",
        header: "Type",
        accessorKey: "productType",
        cell: ({ row }) => <span className="capitalize text-stone-700">{row.productType}</span>,
      },
      {
        id: "sku",
        header: "SKU",
        accessorFn: (row) => row.variants[0]?.sku ?? "—",
        cell: ({ value }) => <span className="font-mono text-stone-500">{String(value)}</span>,
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
        header: "Availability",
        accessorFn: (row) => row.variants[0]?.stock ?? 0,
        cell: ({ row }) => {
          const variant = row.variants[0];
          const stock = variant?.stock ?? 0;
          const availability =
            row.productType === "physical"
              ? `${stock} units`
              : row.productType === "digital"
                ? "Instant access"
                : `${row.fulfilment?.serviceDurationMinutes ?? 60} min`;
          return (
            <span
              className={
                stock < 10 && row.productType === "physical"
                  ? "font-semibold text-red-700"
                  : "font-semibold text-stone-700"
              }
            >
              {availability}
            </span>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => (
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
        ),
      },
      {
        id: "actions",
        header: "Actions",
        sortable: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setEditing(row)}
              className="grid size-8 place-items-center rounded-full text-stone-500 transition hover:bg-stone-200 hover:text-[#5f6048]"
              aria-label={`Edit ${row.name}`}
            >
              <Pencil className="size-3.5" />
            </button>
            {!inventoryOnly ? (
              <button
                type="button"
                onClick={() => setArchiveTarget(row)}
                disabled={busy}
                className="grid size-8 place-items-center rounded-full text-stone-500 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                aria-label={`Archive ${row.name}`}
              >
                <Trash2 className="size-3.5" />
              </button>
            ) : null}
          </div>
        ),
      },
    ],
    [busy, inventoryOnly],
  );

  const filters: FilterDef<VendorProduct>[] = useMemo(() => {
    const list: FilterDef<VendorProduct>[] = [
      {
        key: "productType",
        label: "Type",
        options: TYPE_OPTIONS,
      },
    ];

    if (!inventoryOnly) {
      list.push({
        key: "status",
        label: "Status",
        options: STATUS_OPTIONS,
      });
    }

    list.push({
      key: "stock_status",
      label: "Stock Level",
      options: STOCK_OPTIONS,
      filterFn: (row, val) => {
        const stock = row.variants[0]?.stock ?? 0;
        if (val === "in_stock") return stock > 10;
        if (val === "low_stock") return stock > 0 && stock <= 10;
        if (val === "out_of_stock") return stock === 0;
        return true;
      },
    });

    return list;
  }, [inventoryOnly]);

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[.11em] text-[#5f6048] uppercase">
            Vendor workspace
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-.045em] sm:text-4xl">
            {inventoryOnly ? "Inventory" : "Products"}
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            {inventoryOnly
              ? "Adjust live stock levels and inspect product availability."
              : "Start with a product template, then customise details before submitting for approval."}
          </p>
        </div>
        {!inventoryOnly ? (
          <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsStandaloneMediaOpen(true)}
            >
              <Folder className="size-4 mr-1 text-stone-500" /> Media Library
            </Button>
            <Button onClick={() => setEditing("new")}>
              <Plus className="size-4" /> Add product
            </Button>
          </div>
        ) : null}
      </div>

      <div className="mt-7">
        {loading ? (
          <div className="border border-stone-200 bg-[#fcfaf6] p-12 text-center text-sm text-stone-500">
            Loading products...
          </div>
        ) : (
          <DataTable
            data={items}
            columns={columns}
            filters={filters}
            searchPlaceholder="Search product name, SKU, or category..."
            searchFilter={(product, query) => {
              const name = product.name.toLowerCase();
              const category = product.category.toLowerCase();
              const sku = (product.variants[0]?.sku ?? "").toLowerCase();
              return name.includes(query) || category.includes(query) || sku.includes(query);
            }}
            defaultPageSize={10}
            emptyMessage="No matching products found."
            rowKey={(item) => item._id}
          />
        )}
      </div>

      <AnimatePresence>
        {editing ? (
          <ProductEditor
            product={editing === "new" ? null : editing}
            inventoryOnly={inventoryOnly}
            busy={busy}
            onClose={() => setEditing(null)}
            onSave={save}
          />
        ) : null}
      </AnimatePresence>

      <MediaManagerModal
        isOpen={isStandaloneMediaOpen}
        onClose={() => setIsStandaloneMediaOpen(false)}
        mode="manage"
        title="Studio Media Library (Cloudinary)"
      />

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="Archive Product"
        description={`Are you sure you want to archive "${archiveTarget?.name}"? It will no longer be visible or purchasable in the public storefront.`}
        confirmLabel="Archive Product"
        cancelLabel="Keep Product"
        variant="danger"
        busy={busy}
        onConfirm={confirmArchive}
        onClose={() => setArchiveTarget(null)}
      />
    </div>
  );
}

function ProductEditor({
  product,
  inventoryOnly,
  busy,
  onClose,
  onSave,
}: {
  product: VendorProduct | null;
  inventoryOnly: boolean;
  busy: boolean;
  onClose: () => void;
  onSave: (data: FormData) => Promise<void>;
}) {
  const [productType, setProductType] = useState<ProductType>(product?.productType ?? "physical");
  const [formVersion, setFormVersion] = useState(0);
  const { toast } = useToast();
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [primaryImage, setPrimaryImage] = useState<string>(product?.images?.[0] ?? "");
  const [galleryImages, setGalleryImages] = useState<string[]>(product?.images?.slice(1) ?? []);
  const [isPrimaryPickerOpen, setIsPrimaryPickerOpen] = useState(false);
  const [isGalleryPickerOpen, setIsGalleryPickerOpen] = useState(false);
  const isLoading = busy || submitting;
  const variant = product?.variants[0];
  const template = templateFor(productType);

  function selectTemplate(type: ProductType) {
    if (type === productType) return;
    setProductType(type);
    setFormVersion((version) => version + 1);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      const invalid = form.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(":invalid");
      const label =
        invalid?.closest("label")?.querySelector("span")?.textContent?.replace(/\(.*\)/, "").trim() ||
        invalid?.name ||
        "Field";
      const message = invalid?.validationMessage || "Please fill in this field correctly.";
      const errText = `${label}: ${message}`;
      setFormError(errText);
      toast.error(errText, "Validation Error");
      invalid?.focus();
      return;
    }
    const formData = new FormData(form);
    setSubmitting(true);
    try {
      await onSave(formData);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to save product.";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const shippingLabel =
    productType === "physical"
      ? "This product requires shipping"
      : "This template has no shipping charge";
  const deliveryFieldLabel =
    productType === "service"
      ? "Booking details"
      : productType === "digital"
        ? "Buyer delivery details"
        : "Delivery notes";

  return (
    <motion.div
      key="product-editor-drawer"
      className="fixed inset-0 z-[80] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={product ? "Edit product" : "Add product"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close editor"
      />
      <motion.aside
        className="relative h-full w-full max-w-xl overflow-y-auto bg-[#fbf7ef] p-6 sm:p-8"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[.12em] text-[#5f6048] uppercase">
              Catalogue editor
            </p>
            <h2 className="mt-2 font-serif text-4xl">
              {product
                ? inventoryOnly
                  ? "Adjust inventory"
                  : "Edit product"
                : "Choose a template"}
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-stone-500">
              {inventoryOnly
                ? "Update the live sellable quantity for this listing."
                : "Templates set sensible fulfilment defaults. You can customise every customer-facing detail below."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-stone-200"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {!inventoryOnly ? (
          <div
            className="mt-7 grid gap-3 sm:grid-cols-3"
            role="radiogroup"
            aria-label="Product template"
          >
            {PRODUCT_TEMPLATES.map((item) => {
              const Icon = item.Icon;
              const selected = item.type === productType;
              return (
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  key={item.type}
                  onClick={() => selectTemplate(item.type)}
                  className={`cursor-pointer border p-4 text-left transition ${
                    selected
                      ? "border-[#5f6048] bg-[#e9ecde] shadow-[0_8px_22px_rgba(57,59,39,.10)]"
                      : "border-stone-200 bg-white hover:border-stone-400"
                  }`}
                >
                  <Icon className={`size-4 ${selected ? "text-[#5f6048]" : "text-stone-500"}`} />
                  <p className="mt-4 text-sm font-semibold">{item.label}</p>
                  <p className="mt-1 text-[11px] leading-5 text-stone-500">{item.description}</p>
                </button>
              );
            })}
          </div>
        ) : null}

        {formError && (
          <div className="mt-6 border border-red-200 bg-red-50 p-3.5 text-xs text-red-800">
            {formError}
          </div>
        )}

        <form
          noValidate
          key={`${product?._id ?? "new"}-${productType}-${formVersion}`}
          onSubmit={handleSubmit}
          className="mt-6 space-y-4"
        >
          {!inventoryOnly ? (
            <>
              <input type="hidden" name="productType" value={productType} />
              <div className="border border-[#d9dacb] bg-[#f1f2e9] px-4 py-3">
                <p className="text-xs font-semibold text-[#4f513a]">
                  {template.shortLabel} template selected
                </p>
                <p className="mt-1 text-[11px] leading-5 text-stone-600">
                  {productType === "physical"
                    ? "Shipping, stock, and dispatch details are enabled."
                    : productType === "digital"
                      ? "Shipping is disabled and delivery guidance is shown after payment."
                      : "Shipping is disabled and buyers receive booking instructions after payment."}
                </p>
              </div>
              <Field
                name="name"
                label="Product name"
                defaultValue={product?.name}
                placeholder={
                  productType === "service"
                    ? "e.g. 60-minute design consultation"
                    : productType === "digital"
                      ? "e.g. Brand planning workbook"
                      : "e.g. Hand-thrown dinner plate"
                }
              />
              <Field name="maker" label="Maker / studio" defaultValue={product?.maker} />
              <Field
                name="category"
                label="Category"
                defaultValue={product?.category ?? template.category}
              />
              <label className="block">
                <span className="mb-2 block text-xs font-medium">Description</span>
                <textarea
                  name="description"
                  required
                  minLength={30}
                  defaultValue={product?.description}
                  placeholder="What makes this offering useful, distinctive, and right for the buyer?"
                  className="min-h-28 w-full border border-stone-300 bg-white p-3 text-sm outline-none transition focus:border-stone-500"
                />
              </label>
              {/* Product Photography & Cloudinary Media Manager */}
              <div className="space-y-4 border border-stone-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-semibold text-stone-900 uppercase tracking-wider">
                      Product Photography
                    </h4>
                    <p className="text-[11px] text-stone-500">
                      Cloudinary folder: <span className="font-mono text-stone-700">morrow/vendors/…</span>
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPrimaryPickerOpen(true)}
                    className="text-xs h-7"
                  >
                    <Folder className="size-3.5 mr-1" /> Media Library
                  </Button>
                </div>

                <input type="hidden" name="image" value={primaryImage} />
                <input type="hidden" name="galleryImages" value={JSON.stringify(galleryImages)} />

                {/* Primary Image Preview */}
                <div>
                  <span className="mb-1.5 block text-xs font-medium text-stone-700">
                    Primary Showcase Image *
                  </span>
                  {primaryImage ? (
                    <div className="relative aspect-[16/9] w-full overflow-hidden rounded border border-stone-200 bg-stone-100 group">
                      <Image
                        src={primaryImage}
                        alt="Primary showcase preview"
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-100 sm:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex flex-wrap items-center justify-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="text-xs h-8 bg-white text-stone-900 hover:bg-stone-100"
                          onClick={() => setIsPrimaryPickerOpen(true)}
                        >
                          Change Image
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="text-xs h-8 bg-white text-red-700 hover:bg-red-50 hover:text-red-800 border-red-200"
                          onClick={() => setPrimaryImage("")}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsPrimaryPickerOpen(true)}
                      className="flex flex-col items-center justify-center w-full aspect-[16/9] border-2 border-dashed border-stone-300 hover:border-[#91412e] rounded bg-stone-50/50 hover:bg-stone-50 transition-colors p-4"
                    >
                      <ImageIcon className="size-7 text-stone-400 stroke-1" />
                      <span className="mt-2 text-xs font-medium text-stone-700">
                        Choose Primary Image
                      </span>
                      <span className="text-[10px] text-stone-500">
                        Upload to Cloudinary or select from media library
                      </span>
                    </button>
                  )}
                </div>

                {/* Gallery Images Strip */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-medium text-stone-700">
                      Product Gallery ({galleryImages.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsGalleryPickerOpen(true)}
                      className="text-xs text-[#91412e] hover:underline font-medium inline-flex items-center gap-1"
                    >
                      <Plus className="size-3" /> Add / Manage Gallery
                    </button>
                  </div>

                  {galleryImages.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                      {galleryImages.map((img, idx) => (
                        <div
                          key={idx}
                          className="relative aspect-square rounded overflow-hidden border border-stone-200 group bg-stone-100"
                        >
                          <Image
                            src={img}
                            alt={`Gallery view ${idx + 1}`}
                            fill
                            className="object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setGalleryImages((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="absolute top-1 right-1 p-1 rounded-full bg-white/90 text-stone-700 hover:text-red-700 opacity-100 sm:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity shadow"
                            aria-label="Remove image from gallery"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-stone-500 italic">
                      No additional gallery views. Click &quot;Add / Manage Gallery&quot; to pick secondary angles.
                    </p>
                  )}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  name="sku"
                  label="SKU"
                  defaultValue={variant?.sku}
                  placeholder="STUDIO-001"
                />
                <Field
                  name="price"
                  label="Price (INR)"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={(variant?.pricePaise ?? 0) / 100}
                />
              </div>
              {productType === "physical" ? (
                <Field
                  name="materials"
                  label="Materials / composition"
                  required={false}
                  defaultValue={product?.materials}
                  placeholder="e.g. Stoneware, food-safe glaze"
                />
              ) : null}
              <Field
                name="deliveryLabel"
                label="Fulfilment label"
                defaultValue={product?.fulfilment?.deliveryLabel ?? template.deliveryLabel}
                placeholder={template.deliveryLabel}
              />
              <Field
                name="delivery"
                label={deliveryFieldLabel}
                required={false}
                defaultValue={product?.delivery ?? template.delivery}
                placeholder={template.delivery}
              />
              {productType === "service" ? (
                <Field
                  name="serviceDurationMinutes"
                  label="Service duration (minutes)"
                  type="number"
                  min="5"
                  max="1440"
                  defaultValue={
                    product?.fulfilment?.serviceDurationMinutes ?? template.serviceDurationMinutes
                  }
                />
              ) : null}
              <label
                className={`flex items-center gap-3 border p-3 text-xs ${
                  productType === "physical"
                    ? "cursor-pointer border-stone-300 bg-white"
                    : "border-stone-200 bg-stone-100 text-stone-500"
                }`}
              >
                <input
                  type="checkbox"
                  name="requiresShipping"
                  disabled={productType !== "physical"}
                  defaultChecked={
                    productType === "physical" &&
                    (product?.fulfilment?.requiresShipping ?? template.requiresShipping)
                  }
                  className="size-4 accent-[#5f6048]"
                />{" "}
                {shippingLabel}
              </label>
            </>
          ) : (
            <>
              <input type="hidden" name="name" value={product?.name} />
              <input type="hidden" name="maker" value={product?.maker} />
              <input type="hidden" name="description" value={product?.description} />
              <input type="hidden" name="category" value={product?.category} />
              <input type="hidden" name="productType" value={productType} />
              <input type="hidden" name="image" value={product?.images[0]} />
              <input
                type="hidden"
                name="galleryImages"
                value={JSON.stringify(product?.images?.slice(1) ?? [])}
              />
              <input type="hidden" name="sku" value={variant?.sku} />
              <input type="hidden" name="price" value={(variant?.pricePaise ?? 0) / 100} />
              <input type="hidden" name="materials" value={product?.materials} />
              <input type="hidden" name="delivery" value={product?.delivery} />
              <input
                type="hidden"
                name="deliveryLabel"
                value={product?.fulfilment?.deliveryLabel}
              />
              <input
                type="hidden"
                name="serviceDurationMinutes"
                value={product?.fulfilment?.serviceDurationMinutes}
              />
              <input
                type="hidden"
                name="requiresShipping"
                value={product?.fulfilment?.requiresShipping ? "on" : ""}
              />
            </>
          )}
          <Field
            name="stock"
            label={template.stockLabel}
            type="number"
            min="0"
            step="1"
            defaultValue={variant?.stock ?? template.defaultStock}
          />
          <label className="block">
            <span className="mb-2 block text-xs font-medium">Status</span>
            <select
              name="status"
              defaultValue={product?.status ?? "draft"}
              className="h-11 w-full cursor-pointer border border-stone-300 bg-white px-3 text-sm"
            >
              <option value="draft">Draft</option>
              <option value="submitted">Submit for review</option>
              {product?.status === "active" ? <option value="active">Active</option> : null}
              <option value="archived">Archived</option>
            </select>
          </label>
          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            {product ? "Save changes" : "Create product"}
          </Button>
        </form>
      </motion.aside>

      <MediaManagerModal
        isOpen={isPrimaryPickerOpen}
        onClose={() => setIsPrimaryPickerOpen(false)}
        mode="picker-single"
        title="Select Primary Product Image"
        initialSelectedUrls={primaryImage ? [primaryImage] : []}
        onSelect={(urls) => {
          if (urls[0]) setPrimaryImage(urls[0]);
        }}
      />

      <MediaManagerModal
        isOpen={isGalleryPickerOpen}
        onClose={() => setIsGalleryPickerOpen(false)}
        mode="picker-multiple"
        title="Select Product Gallery Images"
        initialSelectedUrls={galleryImages}
        onSelect={(urls) => {
          setGalleryImages(urls);
        }}
      />
    </motion.div>
  );
}

function Field({
  label,
  required = true,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium">{label}</span>
      <Input required={required} {...props} />
    </label>
  );
}
