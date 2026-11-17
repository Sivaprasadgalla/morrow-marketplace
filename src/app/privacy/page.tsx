import Link from "next/link";

export default function PrivacyPage() {
  return <main className="mx-auto max-w-3xl px-5 py-20 sm:px-8"><p className="text-[11px] font-semibold tracking-[.14em] text-[#91412e] uppercase">Morrow legal</p><h1 className="mt-4 font-serif text-5xl tracking-[-.05em]">Privacy</h1><p className="mt-10 text-sm leading-7 text-stone-600">Morrow uses account, delivery and order information solely to operate the marketplace, process payments, provide fulfilment, and meet legal obligations. Payment card information is handled by the payment provider and is not stored by Morrow.</p><Link href="/" className="mt-12 inline-block border-b border-stone-950 pb-1 text-sm font-semibold">Return home</Link></main>;
}
