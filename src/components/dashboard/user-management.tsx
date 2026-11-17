"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, LoaderCircle, Pencil, Plus, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { ColumnDef, DataTable, FilterDef } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { useToast } from "@/components/ui/toast";
import { formatApiErrorMessage } from "@/lib/utils";

type ManagedUser = {
  _id: string;
  name: string;
  email: string;
  role: "customer" | "vendor" | "admin";
  status: "active" | "pending" | "suspended";
  emailVerified?: string;
  vendorProfile?: { storeName?: string };
  createdAt?: string;
  lastLoginAt?: string;
};

const ROLE_OPTIONS = [
  { label: "Customers", value: "customer" },
  { label: "Vendors", value: "vendor" },
  { label: "Super admins", value: "admin" },
];

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Pending", value: "pending" },
  { label: "Suspended", value: "suspended" },
];

const VERIFICATION_OPTIONS = [
  { label: "Verified", value: "verified" },
  { label: "Unverified", value: "unverified" },
];

export function UserManagement({
  initialRole = "all",
}: {
  initialRole?: "all" | "customer" | "vendor" | "admin";
}) {
  const { toast } = useToast();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [editing, setEditing] = useState<ManagedUser | null | "new">(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/admin/users?limit=100")
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<{ users: ManagedUser[] }>;
      })
      .then((payload) => {
        setUsers(payload.users);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Unable to load live users from database.");
        setLoading(false);
      });
  }, [toast]);

  async function save(formData: FormData) {
    setBusy(true);
    const isNew = editing === "new";
    const current = isNew ? null : editing;
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const role = String(formData.get("role") || "customer");
    const status = String(formData.get("status") || "active");
    const password = String(formData.get("password") || "").trim();
    const storeName = String(formData.get("storeName") || "").trim();
    const verified = formData.get("verified") === "on";

    if (password && password.length < 10) {
      setBusy(false);
      const msg = "Password must be at least 10 characters.";
      toast.error(msg, "Validation Error");
      throw new Error(msg);
    }

    if (isNew && !password) {
      setBusy(false);
      const msg = "Temporary password is required (min 10 characters).";
      toast.error(msg, "Validation Error");
      throw new Error(msg);
    }

    if (role === "vendor" && !storeName && isNew) {
      setBusy(false);
      const msg = "Store name is required for vendor accounts.";
      toast.error(msg, "Validation Error");
      throw new Error(msg);
    }

    const payload: Record<string, unknown> = {
      name,
      email,
      role,
      status,
      verified,
    };
    if (password) payload.password = password;
    if (role === "vendor" && storeName) payload.storeName = storeName;

    try {
      const response = await fetch(isNew ? "/api/admin/users" : `/api/admin/users/${current?._id}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { user?: ManagedUser; error?: string; details?: unknown };
      if (!response.ok || !result.user) {
        throw new Error(formatApiErrorMessage(result, "Unable to save this user."));
      }
      setUsers((existing) =>
        isNew
          ? [result.user!, ...existing]
          : existing.map((user) => (user._id === result.user?._id ? result.user! : user)),
      );
      setEditing(null);
      toast.success(isNew ? "User created successfully." : "User updated successfully.");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unable to save this user.";
      toast.error(msg);
      throw error;
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/users/${deleteTarget._id}`, { method: "DELETE" });
      const result = (await response.json()) as { error?: string; details?: unknown };
      if (!response.ok) {
        throw new Error(formatApiErrorMessage(result, "Unable to delete this user."));
      }
      setUsers((existing) => existing.filter((item) => item._id !== deleteTarget._id));
      toast.success(`${deleteTarget.name} has been deleted.`);
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete this user.");
    } finally {
      setBusy(false);
    }
  }

  const columns: ColumnDef<ManagedUser>[] = useMemo(
    () => [
      {
        id: "name",
        header: "User",
        accessorKey: "name",
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-stone-900">{row.name}</p>
            <p className="mt-0.5 text-[11px] text-stone-500">
              {row.email}
              {row.vendorProfile?.storeName ? ` · ${row.vendorProfile.storeName}` : ""}
            </p>
          </div>
        ),
      },
      {
        id: "role",
        header: "Role",
        accessorKey: "role",
        cell: ({ row }) => <span className="capitalize text-stone-700">{row.role}</span>,
      },
      {
        id: "verification",
        header: "Verification",
        accessorFn: (row) => (row.emailVerified ? "Verified" : "Unverified"),
        cell: ({ row }) => (
          <Pill tone={row.emailVerified ? "good" : "warning"}>
            {row.emailVerified ? "Verified" : "Unverified"}
          </Pill>
        ),
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => (
          <Pill
            tone={
              row.status === "active" ? "good" : row.status === "pending" ? "warning" : "danger"
            }
          >
            {row.status}
          </Pill>
        ),
      },
      {
        id: "lastLoginAt",
        header: "Last login",
        accessorFn: (row) => (row.lastLoginAt ? new Date(row.lastLoginAt) : null),
        cell: ({ row }) => (
          <span className="text-stone-500">
            {row.lastLoginAt
              ? new Intl.DateTimeFormat("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(row.lastLoginAt))
              : "Never"}
          </span>
        ),
      },
      {
        id: "createdAt",
        header: "Created",
        accessorFn: (row) => (row.createdAt ? new Date(row.createdAt) : null),
        cell: ({ row }) => (
          <span className="text-stone-500">
            {row.createdAt
              ? new Intl.DateTimeFormat("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }).format(new Date(row.createdAt))
              : "—"}
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
              className="grid size-8 place-items-center rounded-full text-stone-500 transition hover:bg-stone-200 hover:text-[#91412e]"
              aria-label={`Edit ${row.name}`}
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDeleteTarget(row)}
              disabled={busy}
              className="grid size-8 place-items-center rounded-full text-stone-500 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
              aria-label={`Delete ${row.name}`}
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ),
      },
    ],
    [busy],
  );

  const filters: FilterDef<ManagedUser>[] = useMemo(() => {
    return [
      {
        key: "role",
        label: "Role",
        options: ROLE_OPTIONS,
      },
      {
        key: "status",
        label: "Status",
        options: STATUS_OPTIONS,
      },
      {
        key: "verification",
        label: "Verification",
        options: VERIFICATION_OPTIONS,
        filterFn: (row, val) => {
          if (val === "verified") return Boolean(row.emailVerified);
          if (val === "unverified") return !row.emailVerified;
          return true;
        },
      },
    ];
  }, []);

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[.11em] text-[#91412e] uppercase">
            Identity and access
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-.045em] sm:text-4xl">
            {initialRole === "vendor"
              ? "Vendors"
              : initialRole === "customer"
                ? "Customers"
                : "Users"}
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            Create, update, verify, suspend or delete customer, vendor and administrator accounts.
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus className="size-4" /> Add user
        </Button>
      </div>

      <div className="mt-7">
        {loading ? (
          <div className="border border-stone-200 bg-[#fcfaf6] p-12 text-center text-sm text-stone-500">
            Loading users...
          </div>
        ) : (
          <DataTable
            data={users}
            columns={columns}
            filters={filters}
            initialFilters={{ role: initialRole }}
            searchPlaceholder="Search name, email, or store..."
            searchFilter={(user, query) => {
              const name = user.name.toLowerCase();
              const email = user.email.toLowerCase();
              const store = (user.vendorProfile?.storeName ?? "").toLowerCase();
              return name.includes(query) || email.includes(query) || store.includes(query);
            }}
            defaultPageSize={10}
            emptyMessage="No matching users found."
            rowKey={(user) => user._id}
          />
        )}
      </div>

      <AnimatePresence>
        {editing ? (
          <UserEditor
            user={editing === "new" ? null : editing}
            busy={busy}
            onClose={() => setEditing(null)}
            onSave={save}
          />
        ) : null}
      </AnimatePresence>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete User Account"
        description={`Are you sure you want to delete ${deleteTarget?.name}? Their account will be suspended and removed from active lists.`}
        confirmLabel="Delete User"
        cancelLabel="Keep User"
        variant="danger"
        busy={busy}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function UserEditor({
  user,
  busy,
  onClose,
  onSave,
}: {
  user: ManagedUser | null;
  busy: boolean;
  onClose: () => void;
  onSave: (formData: FormData) => Promise<void>;
}) {
  const { toast } = useToast();
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isLoading = busy || submitting;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      const invalid = form.querySelector<HTMLInputElement | HTMLSelectElement>(":invalid");
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
      const msg = err instanceof Error ? err.message : "Unable to save this user.";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      key="user-editor-drawer"
      className="fixed inset-0 z-[80] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={user ? "Edit user" : "Add user"}
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
        className="relative h-full w-full max-w-lg overflow-y-auto bg-[#fbf7ef] p-6 shadow-2xl sm:p-8"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold tracking-[.12em] text-[#91412e] uppercase">
              Super admin
            </p>
            <h2 className="mt-2 font-serif text-4xl">{user ? "Edit user" : "Add user"}</h2>
            {user?.lastLoginAt ? (
              <p className="mt-1 text-xs text-stone-500">
                Last login:{" "}
                {new Intl.DateTimeFormat("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(user.lastLoginAt))}
              </p>
            ) : user ? (
              <p className="mt-1 text-xs text-stone-400">Never logged in</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-full hover:bg-stone-200"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {formError && (
          <div className="mt-6 border border-red-200 bg-red-50 p-3.5 text-xs text-red-800">
            {formError}
          </div>
        )}

        <form noValidate onSubmit={handleSubmit} className="mt-6 space-y-5">
          <EditorField name="name" label="Full name" defaultValue={user?.name} />
          <EditorField name="email" label="Email" type="email" defaultValue={user?.email} />
          <label className="block">
            <span className="mb-2 block text-xs font-medium">Role</span>
            <select
              name="role"
              defaultValue={user?.role ?? "customer"}
              className="h-11 w-full cursor-pointer border border-stone-300 bg-white px-3 text-sm"
            >
              <option value="customer">Customer</option>
              <option value="vendor">Vendor</option>
              <option value="admin">Super admin</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-medium">Status</span>
            <select
              name="status"
              defaultValue={user?.status ?? "active"}
              className="h-11 w-full cursor-pointer border border-stone-300 bg-white px-3 text-sm"
            >
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
          </label>
          <EditorField
            name="storeName"
            label="Store name (vendors only)"
            required={false}
            defaultValue={user?.vendorProfile?.storeName}
          />
          <EditorField
            name="password"
            label={user ? "New password (leave blank to keep current, min 10 characters)" : "Temporary password (min 10 characters)"}
            type="password"
            required={!user}
            minLength={10}
            autoComplete="new-password"
          />
          <label className="flex cursor-pointer items-center gap-3 border border-stone-300 bg-white p-4 text-xs">
            <input
              type="checkbox"
              name="verified"
              defaultChecked={Boolean(user?.emailVerified ?? true)}
              className="size-4 accent-[#91412e]"
            />
            <span>
              <strong className="block">Email verified</strong>
              <span className="mt-1 block text-stone-500">
                Allow credentials login without sending a verification link.
              </span>
            </span>
          </label>
          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            {user ? "Save changes" : "Create user"}
          </Button>
        </form>
      </motion.aside>
    </motion.div>
  );
}

function EditorField({
  label,
  required = true,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; required?: boolean }) {
  const Control = props.type === "password" ? PasswordInput : Input;
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium">{label}</span>
      <Control required={required} {...props} />
    </label>
  );
}

function Pill({ children, tone }: { children: React.ReactNode; tone: "good" | "warning" | "danger" }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${
        tone === "good"
          ? "bg-emerald-100 text-emerald-800"
          : tone === "warning"
            ? "bg-amber-100 text-amber-800"
            : "bg-red-100 text-red-800"
      }`}
    >
      {children}
    </span>
  );
}
