"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Bookmark, Check, ChevronRight, CircleUserRound, Heart, House, LoaderCircle, MapPin, PackageCheck, Plus, Settings2, ShoppingBag, Truck, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { StatusBadge } from "@/components/dashboard/status-badge";
import type { Product } from "@/lib/products";

type Address = { _id?: string; label: string; name: string; phone: string; line1: string; line2?: string; city: string; state: string; postalCode: string; country: string; isDefault: boolean };
type Account = { name: string; email: string; phone?: string; addresses?: Address[] };
type AccountOrder = { _id: string; orderNumber: string; createdAt: string; totalPaise: number; status: string; items: Array<{ productName: string; quantity: number }> };

const tabs = [{ id: "overview", label: "Overview", icon: CircleUserRound }, { id: "orders", label: "Orders", icon: ShoppingBag }, { id: "saved", label: "Saved pieces", icon: Heart }, { id: "addresses", label: "Addresses", icon: MapPin }, { id: "settings", label: "Settings", icon: Settings2 }] as const;
type Tab = typeof tabs[number]["id"];

export function CustomerAccount({ initialName, initialEmail }: { initialName: string; initialEmail: string }) {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("overview");
  const [account, setAccount] = useState<Account>({ name: initialName, email: initialEmail, addresses: [] });
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    return JSON.parse(window.localStorage.getItem("morrow-wishlist") ?? "[]") as string[];
  });
  const [savedProducts, setSavedProducts] = useState<Product[]>([]);
  const [editor, setEditor] = useState<Address | "new" | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void fetch("/api/account").then(async (response) => response.ok ? response.json() as Promise<{ user: Account }> : Promise.reject()).then((payload) => setAccount(payload.user)).catch(() => setNotice("Unable to load your live account details."));
    void fetch("/api/orders").then(async (response) => response.ok ? response.json() as Promise<{ items: AccountOrder[] }> : Promise.reject()).then((payload) => setOrders(payload.items)).catch(() => setNotice("Unable to load your live orders."));
  }, []);

  useEffect(() => {
    if (!savedIds.length) return;
    void Promise.all(savedIds.map(async (id) => { const response = await fetch(`/api/products/${id}`); if (!response.ok) return null; const payload = await response.json() as { product: Product }; return payload.product; }))
      .then((items) => setSavedProducts(items.filter((item): item is Product => Boolean(item))))
      .catch(() => setSavedProducts([]));
  }, [savedIds]);
  const activeOrder = orders.find((order) => ["paid", "processing", "partially_shipped", "shipped"].includes(order.status));
  async function persist(input: Partial<Account>, success: string) {
    const next = { ...account, ...input };
    setAccount(next);
    try {
      const response = await fetch("/api/account", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
      const result = await response.json() as { user?: Account; error?: string };
      if (!response.ok || !result.user) throw new Error(result.error ?? "Could not save changes.");
      setAccount(result.user);
      setNotice(success);
      toast.success(success);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Changes could not be saved.";
      setNotice(msg);
      toast.error(msg);
    }
  }
  function removeSaved(id: string) {
    const next = savedIds.filter((item) => item !== id);
    setSavedIds(next);
    setSavedProducts((items) => items.filter((item) => item.id !== id));
    window.localStorage.setItem("morrow-wishlist", JSON.stringify(next));
    toast.success("Piece removed from saved list.");
  }

  return <div className="mx-auto max-w-[1380px] px-5 py-10 sm:px-8 lg:px-12 lg:py-16"><div className="border-b border-stone-300 pb-9"><p className="text-[11px] font-semibold tracking-[.14em] text-[#91412e] uppercase">Your Morrow</p><div className="mt-3 flex flex-wrap items-end justify-between gap-5"><div><h1 className="font-serif text-5xl tracking-[-.055em] sm:text-6xl">Hello, {account.name.split(" ")[0]}.</h1><p className="mt-3 text-sm text-stone-600">Your pieces, orders and details—kept in one considered place.</p></div><Link href="/shop" className="group inline-flex items-center gap-2 border-b border-stone-950 pb-2 text-sm font-semibold">Browse the edit <ChevronRight className="size-4 transition group-hover:translate-x-1" /></Link></div></div>
    <div className="mt-8 grid gap-8 lg:grid-cols-[220px_1fr]"><aside><nav className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">{tabs.map((item) => { const Icon = item.icon; return <button type="button" key={item.id} onClick={() => setTab(item.id)} className={`flex shrink-0 items-center gap-3 border-l-2 px-3 py-3 text-left text-sm transition ${tab === item.id ? "border-[#91412e] bg-[#eee4d6] font-semibold text-stone-950" : "border-transparent text-stone-500 hover:bg-white/70 hover:text-stone-950"}`}><Icon className="size-4" /> {item.label}</button>; })}</nav><button type="button" onClick={() => signOut({ callbackUrl: "/login" })} className="mt-6 flex w-full items-center gap-3 border-t border-stone-300 px-3 py-4 text-sm text-stone-500 hover:text-red-700"><X className="size-4" /> Sign out</button></aside><main>{notice ? <p className="mb-5 border border-stone-200 bg-[#eee4d6] px-4 py-3 text-xs text-stone-700">{notice}</p> : null}<AnimatePresence mode="wait"><motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .28 }}>{tab === "overview" && <Overview orders={orders} activeOrder={activeOrder} saved={savedProducts.length} onOrders={() => setTab("orders")} />}{tab === "orders" && <Orders orders={orders} />}{tab === "saved" && <Saved items={savedProducts} onRemove={removeSaved} />}{tab === "addresses" && <Addresses addresses={account.addresses ?? []} onAdd={() => setEditor("new")} onEdit={setEditor} />}{tab === "settings" && <Settings account={account} onSave={(input) => void persist(input, "Account details updated.")} />}</motion.div></AnimatePresence></main></div><AnimatePresence>{editor ? <AddressEditor address={editor === "new" ? null : editor} onClose={() => setEditor(null)} onSave={(address) => { const current = account.addresses ?? []; const next = editor === "new" ? [...current, address] : current.map((item) => item._id === editor?._id ? address : item); void persist({ addresses: next }, "Address saved."); setEditor(null); }} /> : null}</AnimatePresence></div>;
}

function Overview({ orders, activeOrder, saved, onOrders }: { orders: AccountOrder[]; activeOrder?: AccountOrder; saved: number; onOrders: () => void }) { return <div><div className="grid gap-3 sm:grid-cols-3"><Metric icon={ShoppingBag} value={String(orders.length)} label="Orders placed" /><Metric icon={Truck} value={activeOrder ? "1" : "—"} label={activeOrder ? "Currently moving" : "No active delivery"} /><Metric icon={Bookmark} value={String(saved)} label="Saved pieces" /></div>{activeOrder ? <section className="mt-6 overflow-hidden border border-stone-200 bg-[#fcfaf6]"><div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 p-5"><div><p className="text-[10px] font-semibold tracking-[.12em] text-[#91412e] uppercase">On its way</p><h2 className="mt-2 font-serif text-3xl">{activeOrder.orderNumber}</h2><p className="mt-1 text-xs text-stone-500">{activeOrder.items.map((item) => item.productName).join(", ")}</p></div><StatusBadge status={activeOrder.status} /></div><div className="grid gap-5 p-5 sm:grid-cols-3"><Track active label="Order confirmed" /><Track active label="With the maker" /><Track active={activeOrder.status === "shipped"} label="On its way" /></div></section> : <Empty icon={PackageCheck} title="Nothing in transit." copy="When a new piece starts moving, its journey will appear here." href="/shop" action="Explore the collection" />}<section className="mt-7"><div className="flex items-end justify-between"><div><p className="text-[10px] font-semibold tracking-[.12em] text-stone-500 uppercase">Order history</p><h2 className="mt-2 font-serif text-4xl">Recently collected</h2></div><button type="button" onClick={onOrders} className="text-sm font-semibold underline underline-offset-4">All orders</button></div><div className="mt-5 grid gap-3">{orders.slice(0, 2).map((order) => <OrderCard key={order._id} order={order} />)}</div></section></div>; }
function Orders({ orders }: { orders: AccountOrder[] }) { return <div><p className="text-[10px] font-semibold tracking-[.12em] text-[#91412e] uppercase">Your orders</p><h2 className="mt-2 font-serif text-5xl">Every order, in one place.</h2><div className="mt-7 space-y-4">{orders.map((order) => <OrderCard key={order._id} order={order} expanded />)}</div></div>; }
function OrderCard({ order, expanded = false }: { order: AccountOrder; expanded?: boolean }) {
  const [tracking, setTracking] = useState(false);
  const isAwaitingPayment = order.status === "awaiting_payment";

  return (
    <article className="border border-stone-200 bg-[#fcfaf6] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-stone-900">#{order.orderNumber}</p>
          <p className="mt-1 text-xs text-stone-500">
            {new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" }).format(
              new Date(order.createdAt),
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAwaitingPayment ? (
            <Link
              href={`/pay/${order._id}`}
              className="inline-flex h-8 items-center bg-[#91412e] px-3 text-xs font-semibold text-white shadow-xs hover:bg-[#7b3524]"
            >
              Pay now
            </Link>
          ) : null}
          <StatusBadge status={order.status} />
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-5 border-t border-stone-200 pt-5">
        <div>
          {order.items.map((item) => (
            <p key={item.productName} className="text-sm">
              {item.productName} <span className="text-stone-500">× {item.quantity}</span>
            </p>
          ))}
        </div>
        <p className="font-serif text-2xl font-medium">₹{(order.totalPaise / 100).toLocaleString("en-IN")}</p>
      </div>
      {expanded ? (
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-stone-200 pt-4">
          {isAwaitingPayment ? (
            <Link
              href={`/pay/${order._id}`}
              className="inline-flex h-9 items-center bg-[#211f1a] px-4 text-xs font-semibold text-white hover:bg-[#36322b]"
            >
              Pay now
            </Link>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setTracking((value) => !value)} className="text-xs">
              {tracking ? "Hide tracking" : "Track order"}
            </Button>
          )}
          <Link
            href={`/order-placed/${order.orderNumber}`}
            className="inline-flex h-9 items-center border border-stone-300 bg-white px-3 text-xs font-medium text-stone-700 hover:bg-stone-50"
          >
            View receipt
          </Link>
          <Link
            href={`/help/shipping-returns?order=${encodeURIComponent(order.orderNumber)}`}
            className="inline-flex h-9 items-center px-3 text-xs text-stone-600 hover:text-stone-950"
          >
            Need help?
          </Link>
          {tracking ? (
            <div className="mt-4 w-full border-t border-stone-200 pt-4">
              <div className="grid gap-3 text-xs sm:grid-cols-3">
                <Track active label="Order confirmed" />
                <Track
                  active={["processing", "partially_shipped", "shipped", "delivered"].includes(order.status)}
                  label="With the maker"
                />
                <Track active={["shipped", "delivered"].includes(order.status)} label="On its way" />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
function Saved({ items, onRemove }: { items: Product[]; onRemove: (id: string) => void }) { return <div><p className="text-[10px] font-semibold tracking-[.12em] text-[#91412e] uppercase">Saved pieces</p><h2 className="mt-2 font-serif text-5xl">Keep an eye on these.</h2>{items.length ? <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{items.map((product) => <article key={product.id} className="border border-stone-200 bg-[#fcfaf6] p-4"><p className="text-[10px] tracking-[.1em] text-stone-500 uppercase">{product.maker}</p><p className="mt-2 font-serif text-2xl">{product.name}</p><div className="mt-5 flex justify-between"><Link href={`/product/${product.slug}`} className="text-xs font-semibold underline underline-offset-4">View piece</Link><button type="button" onClick={() => onRemove(product.id)} className="text-xs text-stone-500 hover:text-red-700">Remove</button></div></article>)}</div> : <Empty icon={Heart} title="Your saved shelf is empty." copy="Tap the heart on any product to keep it here for later." href="/shop" action="Browse the collection" />}</div>; }
function Addresses({ addresses, onAdd, onEdit }: { addresses: Address[]; onAdd: () => void; onEdit: (address: Address) => void }) { return <div><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-semibold tracking-[.12em] text-[#91412e] uppercase">Delivery addresses</p><h2 className="mt-2 font-serif text-5xl">Where your pieces go.</h2></div><Button onClick={onAdd}><Plus className="size-4" /> Add address</Button></div>{addresses.length ? <div className="mt-7 grid gap-4 sm:grid-cols-2">{addresses.map((address) => <article key={address._id ?? address.label} className="border border-stone-200 bg-[#fcfaf6] p-5"><div className="flex justify-between gap-3"><div><p className="font-semibold">{address.label}{address.isDefault ? <span className="ml-2 rounded-full bg-[#eee4d6] px-2 py-1 text-[9px] text-[#91412e]">Default</span> : null}</p><p className="mt-3 text-sm leading-6 text-stone-600">{address.name}<br />{address.line1}<br />{address.city}, {address.state} {address.postalCode}<br />{address.phone}</p></div><button type="button" onClick={() => onEdit(address)} className="text-xs font-semibold underline underline-offset-4">Edit</button></div></article>)}</div> : <Empty icon={House} title="No saved addresses yet." copy="Save an address now to make your next checkout feel effortless." action="Add address" onAction={onAdd} />}</div>; }
function Settings({ account, onSave }: { account: Account; onSave: (input: Partial<Account>) => Promise<void> | void }) {
  const [loading, setLoading] = useState(false);
  return (
    <div>
      <p className="text-[10px] font-semibold tracking-[.12em] text-[#91412e] uppercase">Profile and security</p>
      <h2 className="mt-2 font-serif text-5xl">Your details.</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          const data = new FormData(e.currentTarget);
          const phone = String(data.get("phone") ?? "").trim();
          try {
            await onSave({ name: String(data.get("name")), ...(phone ? { phone } : {}) });
          } finally {
            setLoading(false);
          }
        }}
        className="mt-7 max-w-xl space-y-5 border border-stone-200 bg-[#fcfaf6] p-5 sm:p-7"
      >
        <Field name="name" label="Full name" defaultValue={account.name} />
        <label className="block">
          <span className="mb-2 block text-xs font-medium">Email</span>
          <Input value={account.email} disabled />
        </label>
        <Field name="phone" label="Phone number" defaultValue={account.phone} required={false} placeholder="For delivery updates" />
        <Button type="submit" disabled={loading}>
          {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />} Save details
        </Button>
      </form>
      <div className="mt-5 border border-stone-200 bg-white/50 p-5">
        <p className="font-semibold">Password and sign-in</p>
        <p className="mt-2 text-sm text-stone-500">Need to update your password? We’ll email you a secure, temporary reset link.</p>
        <Link href="/forgot-password" className="mt-4 inline-block text-sm font-semibold underline underline-offset-4">Reset password</Link>
      </div>
    </div>
  );
}

function AddressEditor({ address, onClose, onSave }: { address: Address | null; onClose: () => void; onSave: (address: Address) => Promise<void> | void }) {
  const [loading, setLoading] = useState(false);
  return (
    <div className="fixed inset-0 z-[80] flex justify-end" role="dialog" aria-modal="true">
      <motion.button type="button" onClick={onClose} className="absolute inset-0 bg-black/35" aria-label="Close address form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.aside className="relative h-full w-full max-w-lg overflow-y-auto bg-[#fbf7ef] p-6 sm:p-8" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}>
        <div className="flex justify-between">
          <h2 className="font-serif text-4xl">{address ? "Edit address" : "Add address"}</h2>
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full hover:bg-stone-200"><X className="size-4" /></button>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            const data = new FormData(e.currentTarget);
            try {
              await onSave({
                _id: address?._id,
                label: String(data.get("label")),
                name: String(data.get("name")),
                phone: String(data.get("phone")),
                line1: String(data.get("line1")),
                city: String(data.get("city")),
                state: String(data.get("state")),
                postalCode: String(data.get("postalCode")),
                country: "India",
                isDefault: data.get("isDefault") === "on",
              });
            } finally {
              setLoading(false);
            }
          }}
          className="mt-8 grid gap-4 sm:grid-cols-2"
        >
          <Field name="label" label="Label" defaultValue={address?.label ?? "Home"} />
          <Field name="name" label="Recipient" defaultValue={address?.name} />
          <Field name="phone" label="Phone" defaultValue={address?.phone} />
          <Field name="postalCode" label="PIN code" defaultValue={address?.postalCode} />
          <div className="sm:col-span-2"><Field name="line1" label="Address" defaultValue={address?.line1} /></div>
          <Field name="city" label="City" defaultValue={address?.city} />
          <Field name="state" label="State" defaultValue={address?.state} />
          <label className="sm:col-span-2 flex cursor-pointer items-center gap-3 border border-stone-300 bg-white p-4 text-xs">
            <input type="checkbox" name="isDefault" defaultChecked={address?.isDefault ?? true} className="size-4 accent-[#91412e]" /> Make this my default delivery address
          </label>
          <Button type="submit" className="sm:col-span-2" disabled={loading}>
            {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />} Save address
          </Button>
        </form>
      </motion.aside>
    </div>
  );
}
function Field({ label, required = true, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; required?: boolean }) { return <label className="block"><span className="mb-2 block text-xs font-medium">{label}</span><Input required={required} {...props} /></label>; }
function Metric({ icon: Icon, value, label }: { icon: typeof ShoppingBag; value: string; label: string }) { return <div className="border border-stone-200 bg-[#fcfaf6] p-5"><Icon className="size-4 text-[#91412e]" /><p className="mt-6 text-3xl font-semibold tracking-[-.04em]">{value}</p><p className="mt-1 text-xs text-stone-500">{label}</p></div>; }
function Track({ label, active }: { label: string; active: boolean }) { return <div className="flex items-center gap-3 text-xs"><span className={`grid size-6 place-items-center rounded-full ${active ? "bg-[#39725c] text-white" : "bg-stone-200 text-stone-500"}`}>{active ? <Check className="size-3" /> : ""}</span><span className={active ? "font-semibold" : "text-stone-500"}>{label}</span></div>; }
function Empty({ icon: Icon, title, copy, href, action, onAction }: { icon: typeof Heart; title: string; copy: string; href?: string; action: string; onAction?: () => void }) { return <div className="mt-7 border border-dashed border-stone-300 bg-white/45 p-10 text-center"><Icon className="mx-auto size-6 text-[#91412e]" /><h3 className="mt-4 font-serif text-3xl">{title}</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-stone-500">{copy}</p>{href ? <Link href={href} className="mt-6 inline-block border-b border-stone-900 pb-1 text-sm font-semibold">{action}</Link> : <Button className="mt-6" onClick={onAction}>{action}</Button>}</div>; }
