"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { cartItemKey } from "@/lib/cart";

export function CartDrawer() {
  const { items, subtotal, isOpen, closeCart, removeItem, updateQuantity, isReady, isSyncing, syncError, notices, retrySync } = useCart();

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && closeCart();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeCart, isOpen]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label="Shopping bag">
          <motion.button type="button" className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" aria-label="Close bag" onClick={closeCart} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.aside className="absolute inset-y-0 right-0 flex w-full max-w-[480px] flex-col bg-[#fbf7ef] shadow-2xl" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}>
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-5 sm:px-7"><div><p className="font-serif text-3xl">Your bag</p><p className="mt-1 text-xs text-stone-500">{items.length} thoughtfully chosen {items.length === 1 ? "piece" : "pieces"}</p></div><button type="button" className="grid size-10 place-items-center" onClick={closeCart} aria-label="Close bag"><X className="size-5" /></button></div>
            {syncError && <div role="alert" className="border-b border-red-200 bg-red-50 p-4 text-xs text-red-800"><p>{syncError}</p><Button size="sm" variant="outline" className="mt-2" onClick={retrySync} disabled={isSyncing}>{isSyncing ? "Syncing..." : "Retry syncing"}</Button></div>}
            {notices.length > 0 && <div role="status" className="border-b border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">{notices.map((notice) => <p key={notice}>{notice}</p>)}</div>}
            {!isReady ? <div role="status" className="grid flex-1 place-items-center p-8 text-sm text-stone-500">{syncError ? "Your bag is saved. Retry to continue." : "Preparing your bag..."}</div> : items.length === 0 ? (
              <div className="grid flex-1 place-items-center p-8 text-center"><div><ShoppingBag className="mx-auto size-8 text-stone-400" strokeWidth={1.4} /><h2 className="mt-5 font-serif text-3xl">Your bag is waiting</h2><p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-stone-500">Explore objects made to live with you for years, not seasons.</p><Button className="mt-6" onClick={closeCart}>Continue shopping</Button></div></div>
            ) : (
              <><div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-7">{items.map((item) => (
                <div key={cartItemKey(item)} className="grid grid-cols-[92px_1fr] gap-4 border-b border-stone-200 pb-6"><Link href={`/product/${item.slug}`} onClick={closeCart} className="relative aspect-[4/5] overflow-hidden bg-stone-200"><Image src={item.image} alt={item.name} fill sizes="92px" className="object-cover" /></Link><div className="flex min-w-0 flex-col"><p className="text-[10px] tracking-[0.12em] text-stone-500 uppercase">{item.maker}</p><Link href={`/product/${item.slug}`} onClick={closeCart} className="mt-1 font-serif text-xl">{item.name}</Link><p className="mt-1 text-sm">{formatCurrency(item.price)}</p><div className="mt-auto flex items-center justify-between pt-4"><div className="flex items-center border border-stone-300"><button type="button" className="grid size-8 place-items-center" onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1), item.variantId)} aria-label="Decrease quantity"><Minus className="size-3" /></button><span className="w-8 text-center text-xs">{item.quantity}</span><button type="button" className="grid size-8 place-items-center" onClick={() => updateQuantity(item.id, item.quantity + 1, item.variantId)} aria-label="Increase quantity"><Plus className="size-3" /></button></div><button type="button" onClick={() => removeItem(item.id, item.variantId)} className="grid size-8 place-items-center text-stone-400 hover:text-[#9f3f2a]" aria-label={`Remove ${item.name}`}><Trash2 className="size-4" /></button></div></div></div>
              ))}</div><div className="border-t border-stone-200 bg-white/60 p-5 sm:p-7"><div className="flex items-center justify-between"><span className="text-sm">Subtotal</span><span className="font-serif text-2xl">{formatCurrency(subtotal)}</span></div><p className="mt-2 text-xs text-stone-500">Shipping and taxes are calculated at checkout.</p>{isSyncing || syncError ? <Button size="lg" className="mt-5 w-full" disabled>{isSyncing ? "Syncing your bag..." : "Sync your bag to continue"}</Button> : <Link href="/checkout" onClick={closeCart} className={cn(buttonVariants({ size: "lg" }), "mt-5 w-full")}>Secure checkout</Link>}</div></>
            )}
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
