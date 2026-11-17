import Link from "next/link";
import { ArrowUpRight, Camera } from "lucide-react";

export function StoreFooter() {
  return (
    <footer className="bg-[#211f1a] px-5 pb-8 pt-16 text-[#f4eee4] sm:px-8 lg:px-12 lg:pt-24">
      <div className="mx-auto max-w-[1500px]">
        <div className="grid gap-12 border-b border-white/15 pb-14 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div><p className="font-serif text-5xl tracking-[-0.05em]">Morrow</p><p className="mt-5 max-w-sm text-sm leading-6 text-white/60">Objects made with patience, chosen with care, and designed to become part of your everyday.</p></div>
          <div><p className="text-[10px] tracking-[0.14em] text-white/45 uppercase">Discover</p><div className="mt-5 flex flex-col gap-3 text-sm"><Link href="/shop">Shop all</Link><Link href="/shop?sort=newest">New arrivals</Link><Link href="/#makers">Our makers</Link></div></div>
          <div><p className="text-[10px] tracking-[0.14em] text-white/45 uppercase">Help</p><div className="mt-5 flex flex-col gap-3 text-sm"><Link href="/account">Orders</Link><Link href="/help/shipping-returns">Shipping & returns</Link><Link href="/help/care-guide">Care guide</Link></div></div>
          <div><p className="text-[10px] tracking-[0.14em] text-white/45 uppercase">For makers</p><Link href="/login" className="mt-5 flex items-center gap-2 text-sm">Sell on Morrow <ArrowUpRight className="size-4" /></Link></div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 pt-7 text-[11px] text-white/45"><p>© 2026 Morrow Marketplace</p><div className="flex items-center gap-5"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Camera className="size-4" aria-label="Social media" /></div></div>
      </div>
    </footer>
  );
}
