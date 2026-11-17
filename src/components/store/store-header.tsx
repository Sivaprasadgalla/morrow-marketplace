"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { useSession } from "next-auth/react";
import { useCart } from "@/components/cart/cart-provider";
import { cn } from "@/lib/utils";

const links = [
  { label: "New arrivals", href: "/shop?sort=newest" },
  { label: "Shop", href: "/shop" },
  { label: "Makers", href: "/#makers" },
  { label: "Journal", href: "/#journal" },
];

export function StoreHeader() {
  const { data: session } = useSession();
  const { count, openCart } = useCart();
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useMotionValueEvent(scrollY, "change", (current) => {
    const previous = scrollY.getPrevious() ?? 0;
    setScrolled(current > 28);
    setHidden(current > 150 && current > previous);
  });

  const accountHref = session?.user.role === "admin" ? "/admin" : session?.user.role === "vendor" ? "/vendor" : session ? "/account" : "/login";

  return (
    <>
      <div className="bg-[#8f321f] px-4 py-2 text-center text-[10px] font-medium tracking-[0.1em] text-[#fff9f0] uppercase">
        Free shipping across India on orders above ₹4,999
      </div>
      <motion.header
        className={cn(
          "sticky top-0 z-50 border-b transition-colors duration-300",
          scrolled ? "border-stone-200 bg-[#f8f3ea]/92 shadow-[0_6px_25px_rgba(50,35,20,0.07)] backdrop-blur-xl" : "border-stone-200/80 bg-[#f8f3ea]",
        )}
        animate={{ y: hidden ? "-100%" : 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mx-auto grid h-[72px] max-w-[1540px] grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-6 lg:px-10">
          <nav className="hidden items-center gap-7 text-xs lg:flex" aria-label="Primary navigation">
            {links.map((link) => (
              <Link key={link.label} href={link.href} className="relative py-2 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-right after:scale-x-0 after:bg-current after:transition-transform hover:after:origin-left hover:after:scale-x-100">
                {link.label}
              </Link>
            ))}
          </nav>
          <button type="button" onClick={() => setMobileOpen(true)} className="grid size-10 place-items-start lg:hidden" aria-label="Open navigation">
            <Menu className="size-5" />
          </button>

          <Link href="/" className="font-serif text-[30px] leading-none tracking-[-0.055em] sm:text-[34px]">
            Morrow
          </Link>

          <div className="flex items-center justify-end gap-1 sm:gap-2">
            <Link href="/shop" className="hidden size-10 place-items-center sm:grid" aria-label="Search products">
              <Search className="size-[18px]" strokeWidth={1.6} />
            </Link>
            <Link href={accountHref} className="grid size-10 place-items-center" aria-label={session ? "Open dashboard" : "Sign in"}>
              <UserRound className="size-[18px]" strokeWidth={1.6} />
            </Link>
            <button type="button" onClick={openCart} className="relative grid size-10 place-items-center" aria-label={`Open bag with ${count} items`}>
              <ShoppingBag className="size-[18px]" strokeWidth={1.6} />
              {count > 0 ? <span className="absolute right-0.5 top-0.5 grid size-4 place-items-center rounded-full bg-[#9f3f2a] text-[9px] text-white">{count}</span> : null}
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div className="fixed inset-0 z-[80] bg-[#211f1a] text-[#f8f3ea]" initial={{ clipPath: "inset(0 0 100% 0)" }} animate={{ clipPath: "inset(0 0 0% 0)" }} exit={{ clipPath: "inset(0 0 100% 0)" }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
            <div className="flex items-center justify-between px-5 py-6"><span className="font-serif text-3xl">Morrow</span><button type="button" className="grid size-11 place-items-center" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X /></button></div>
            <nav className="flex flex-col px-6 pt-12 font-serif text-[12vw] leading-[1.12]" aria-label="Mobile navigation">
              {links.map((link, index) => (
                <motion.div key={link.label} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 + index * 0.07 }}>
                  <Link href={link.href} onClick={() => setMobileOpen(false)}>{link.label}</Link>
                </motion.div>
              ))}
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
