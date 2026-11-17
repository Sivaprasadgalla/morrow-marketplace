import Link from "next/link";

export default function TermsPage() {
  return <main className="mx-auto max-w-3xl px-5 py-20 sm:px-8"><p className="text-[11px] font-semibold tracking-[.14em] text-[#91412e] uppercase">Morrow legal</p><h1 className="mt-4 font-serif text-5xl tracking-[-.05em]">Terms</h1><p className="mt-10 text-sm leading-7 text-stone-600">By using Morrow, customers agree to provide accurate account and delivery information. Vendors are responsible for accurate listings, lawful fulfilment and their stated product policies. Platform payments are verified server-side before an order is treated as paid.</p><Link href="/" className="mt-12 inline-block border-b border-stone-950 pb-1 text-sm font-semibold">Return home</Link></main>;
}
