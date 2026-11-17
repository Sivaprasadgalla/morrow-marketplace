"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart3, Boxes, ChevronDown, CircleDollarSign, ClipboardCheck, FileText, LayoutDashboard, LogOut, Menu, PackageCheck, Search, Settings, ShieldCheck, ShoppingBag, Store, Users, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { signOut } from "next-auth/react";
import { Avatar } from "@/components/ui/avatar";
import { NotificationsDropdown } from "@/components/dashboard/notifications-dropdown";
import { cn } from "@/lib/utils";

const vendorNav = [
  { label: "Overview", href: "/vendor", icon: LayoutDashboard },
  { label: "Products", href: "/vendor/products", icon: Boxes },
  { label: "Orders", href: "/vendor/orders", icon: ShoppingBag },
  { label: "Inventory", href: "/vendor/inventory", icon: PackageCheck },
  { label: "Earnings", href: "/vendor/earnings", icon: CircleDollarSign },
  { label: "Analytics", href: "/vendor/analytics", icon: BarChart3 },
  { label: "Settings", href: "/vendor/settings", icon: Settings },
];

const adminNav = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Vendors", href: "/admin/vendors", icon: Store },
  { label: "Products", href: "/admin/products", icon: Boxes },
  { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Moderation", href: "/admin/moderation", icon: ClipboardCheck },
  { label: "Reports", href: "/admin/reports", icon: FileText },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export function DashboardShell({
  children,
  role,
  user,
  storeName,
}: {
  children: React.ReactNode;
  role: "vendor" | "admin";
  user: { name: string; email: string };
  storeName?: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = role === "admin" ? adminNav : vendorNav;
  const workspace = role === "admin" ? "Super admin" : storeName || "Vendor workspace";

  const sidebar = (
    <div className="flex h-full flex-col bg-[#171915] px-3 pb-4 text-[#f5efe5]">
      <div className="flex h-[72px] items-center justify-between px-3"><Link href="/" className="font-serif text-3xl tracking-[-0.055em]">Morrow</Link><button type="button" className="grid size-10 place-items-center lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X className="size-5" /></button></div>
      <div className="mb-5 border border-white/10 bg-white/[0.04] p-3"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-[#a7462f] text-white">{role === "admin" ? <ShieldCheck className="size-4" /> : <Store className="size-4" />}</span><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold">{workspace}</p><p className="mt-0.5 text-[11px] text-white/50">{role === "admin" ? "Platform workspace" : "Vendor workspace"}</p></div><ChevronDown className="size-3.5 text-white/40" /></div></div>
      <nav className="space-y-1" aria-label={`${role} navigation`}>{nav.map((item) => { const Icon = item.icon; const active = pathname === item.href; return <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={cn("flex items-center gap-3 border-l-2 px-3 py-2.5 text-[13px] font-medium transition", active ? "border-[#b34e35] bg-[#f4eee4] text-[#171915]" : "border-transparent text-white/65 hover:bg-white/[0.06] hover:text-white")}><Icon className="size-4" strokeWidth={1.8} />{item.label}</Link>; })}</nav>
      <div className="mt-auto border-t border-white/10 pt-4"><Link href="/" className="flex items-center gap-3 px-3 py-2.5 text-xs text-white/60 hover:text-white"><Store className="size-4" />View storefront</Link><button type="button" onClick={() => signOut({ callbackUrl: "/login" })} className="flex w-full items-center gap-3 px-3 py-2.5 text-xs text-white/60 hover:text-white"><LogOut className="size-4" />Sign out</button></div>
    </div>
  );

  return (
    <div className="min-h-svh bg-[#f4f1eb] text-[#20221e] lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="hidden h-svh lg:sticky lg:top-0 lg:block">{sidebar}</aside>
      <AnimatePresence>{mobileOpen ? <><motion.button type="button" className="fixed inset-0 z-50 bg-black/40 lg:hidden" aria-label="Close navigation" onClick={() => setMobileOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} /><motion.aside className="fixed inset-y-0 left-0 z-[60] w-[280px] lg:hidden" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}>{sidebar}</motion.aside></> : null}</AnimatePresence>
      <div className="min-w-0"><header className="sticky top-0 z-40 flex h-[72px] items-center gap-4 border-b border-stone-200 bg-[#fbf9f5]/92 px-4 backdrop-blur-xl sm:px-7"><button type="button" className="grid size-10 place-items-center lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu className="size-5" /></button><label className="relative hidden max-w-md flex-1 md:block"><span className="sr-only">Search dashboard</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" /><input className="h-10 w-full border border-stone-200 bg-white/60 pl-9 pr-3 text-xs outline-none focus:border-stone-400" placeholder="Search orders, products and customers" /></label><div className="ml-auto flex items-center gap-3"><NotificationsDropdown /><div className="hidden h-8 w-px bg-stone-200 sm:block" /><Avatar name={user.name} /><div className="hidden sm:block"><p className="text-xs font-medium">{user.name}</p><p className="mt-0.5 text-[10px] capitalize text-stone-500">{role === "admin" ? "Super admin" : "Store owner"}</p></div></div></header><main className="p-4 sm:p-7 lg:p-8">{children}</main></div>
    </div>
  );
}
