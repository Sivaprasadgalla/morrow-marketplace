import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function AuthPageShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-[#f6f1e8] lg:grid lg:grid-cols-[.9fr_1.1fr]">
      <div className="relative hidden min-h-svh overflow-hidden bg-[#5f6048] lg:block">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1800&q=90')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/20" />
        <Link href="/" className="absolute left-10 top-9 z-10 font-serif text-4xl tracking-[-0.055em] text-white">Morrow</Link>
        <p className="absolute inset-x-12 bottom-12 z-10 max-w-xl font-serif text-5xl leading-[0.96] tracking-[-0.04em] text-white">A considered home for objects—and your account.</p>
      </div>
      <main className="flex min-h-svh items-center px-5 py-10 sm:px-10 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-xl">
          <Link href="/login" className="mb-12 inline-flex items-center gap-2 text-xs text-stone-500 hover:text-stone-950"><ArrowLeft className="size-3.5" /> Back to sign in</Link>
          <p className="text-[10px] tracking-[0.14em] text-stone-500 uppercase">{eyebrow}</p>
          <h1 className="mt-3 font-serif text-5xl tracking-[-0.045em] sm:text-6xl">{title}</h1>
          <p className="mt-4 max-w-lg text-sm leading-6 text-stone-600">{description}</p>
          <div className="mt-9">{children}</div>
        </div>
      </main>
    </div>
  );
}
