import Link from "next/link";

export default function CareGuidePage() {
  return <main className="mx-auto max-w-3xl px-5 py-20 sm:px-8"><p className="text-[11px] font-semibold tracking-[.14em] text-[#91412e] uppercase">Morrow help</p><h1 className="mt-4 font-serif text-5xl tracking-[-.05em]">Care guide</h1><div className="mt-10 space-y-5 text-sm leading-7 text-stone-600"><p>Every maker can include product-specific care details in the live catalogue. Always follow the care guidance attached to your purchased item.</p><p>For handmade objects, natural variation in grain, glaze and weave is part of the material—not a defect.</p></div><Link href="/shop" className="mt-12 inline-block border-b border-stone-950 pb-1 text-sm font-semibold">Back to the collection</Link></main>;
}
