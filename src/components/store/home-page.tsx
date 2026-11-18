"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { Magnetic } from "@/components/motion/magnetic";
import { Reveal } from "@/components/motion/reveal";
import { ScrollStory } from "@/components/motion/scroll-story";
import { TextReveal } from "@/components/motion/text-reveal";
import { ProductCard } from "@/components/store/product-card";
import { buttonVariants } from "@/components/ui/button";
import type { Product } from "@/lib/products";
import { cn } from "@/lib/utils";

const categories = [
  { name: "Homeware", image: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=900&q=85" },
  { name: "Furniture", image: "https://images.unsplash.com/photo-1598300056393-4aac492f4344?auto=format&fit=crop&w=900&q=85" },
  { name: "Lighting", image: "https://images.unsplash.com/photo-1540932239986-30128078f3c5?auto=format&fit=crop&w=900&q=85" },
  { name: "Textiles", image: "https://images.unsplash.com/photo-1600166898405-da9535204843?auto=format&fit=crop&w=900&q=85" },
];

export function HomePage({ products }: { products: Product[] }) {
  const heroRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const imageY = useTransform(scrollYProgress, [0, 1], [0, 110]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -35]);
  const opacity = useTransform(scrollYProgress, [0, 0.82], [1, 0.35]);

  return (
    <div className="overflow-hidden">
      <section ref={heroRef} className="grid border-b border-stone-300 lg:min-h-[calc(100svh-104px)] lg:grid-cols-[minmax(0,37fr)_minmax(0,63fr)]">
        <motion.div style={reduceMotion ? undefined : { y: copyY, opacity }} className="@container relative z-10 flex min-h-[420px] min-w-0 flex-col justify-between bg-[#8f321f] px-5 py-8 text-[#fff8ee] sm:min-h-[480px] sm:px-9 sm:py-14 lg:min-h-0 lg:px-12 lg:py-16 xl:px-16">
          <div className="flex items-center justify-between text-[10px] font-medium tracking-[0.15em] text-white/65 uppercase"><span>The slow home edit</span><span>Vol. 04</span></div>
          <div className="py-10 sm:py-14 lg:py-6">
            <h1 className="max-w-[680px] font-serif text-[clamp(3rem,15cqi,4.5rem)] leading-[1.02] tracking-[-0.055em] text-balance lg:text-[clamp(3rem,24cqi,8rem)]">
              <TextReveal text="Objects worth keeping." />
            </h1>
            <motion.p className="mt-8 max-w-md text-sm leading-6 text-white/75 sm:text-base" initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={reduceMotion ? undefined : { opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.7 }}>
              Made slowly. Chosen carefully. A marketplace for pieces with a life beyond trends.
            </motion.p>
            <motion.div className="mt-8" initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={reduceMotion ? undefined : { opacity: 1, y: 0 }} transition={{ delay: 0.85, duration: 0.7 }}>
              <Magnetic><Link href="/shop" className={cn(buttonVariants({ variant: "inverse", size: "lg" }), "group")}>Shop the edit <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></Link></Magnetic>
            </motion.div>
          </div>
          <div className="flex items-end justify-between text-[10px] tracking-[0.12em] text-white/55 uppercase"><span>Independent Indian studios</span><ArrowDown className="size-4 animate-bounce" /></div>
        </motion.div>

        <div className="relative min-h-[320px] overflow-hidden bg-stone-300 sm:min-h-[440px] lg:min-h-0">
          <motion.div className="absolute inset-[-8%_0]" style={reduceMotion ? undefined : { y: imageY }}>
            <Image src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2000&q=90" alt="Warm contemporary living room with handcrafted furniture" fill priority sizes="(max-width: 1024px) 100vw, 63vw" className="object-cover" />
          </motion.div>
          <motion.div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/5" initial={{ opacity: 0.5 }} animate={{ opacity: 1 }} transition={{ duration: 1.2 }} />
          <Reveal className="absolute bottom-5 right-5 max-w-[220px] bg-[#f7f1e7]/92 p-4 text-[#211f1a] backdrop-blur-md sm:bottom-8 sm:right-8" delay={0.8} y={12}>
            <p className="text-[9px] font-medium tracking-[0.13em] text-stone-500 uppercase">The room edit</p><p className="mt-2 font-serif text-xl leading-tight">Earth tones, honest materials, quieter living.</p><Link href="/shop" className="mt-4 flex items-center gap-2 text-xs font-medium">Explore the collection <ArrowUpRight className="size-3.5" /></Link>
          </Reveal>
        </div>
      </section>

      <section className="border-b border-stone-300 bg-[#efe6d8] px-4 py-4 sm:px-7">
        <div className="mx-auto grid max-w-[1540px] grid-cols-2 gap-2 lg:grid-cols-4">
          {categories.map((category, index) => (
            <Reveal key={category.name} delay={index * 0.07} className="group relative aspect-[2.3/1] overflow-hidden bg-stone-300 lg:aspect-[2.5/1]">
              <Image src={category.image} alt="" fill sizes="(max-width: 1024px) 50vw, 25vw" className="object-cover transition duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/15 to-transparent" />
              <Link href={`/category/${category.name.toLowerCase()}`} className="absolute inset-0 flex items-end justify-between p-4 text-white"><span className="font-serif text-xl sm:text-2xl">{category.name}</span><ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-[1500px]">
          <div className="mb-12 flex items-end justify-between gap-6"><Reveal><p className="text-[10px] tracking-[0.14em] text-stone-500 uppercase">A thoughtful starting point</p><h2 className="mt-3 font-serif text-5xl tracking-[-0.045em] sm:text-6xl">Curated for your space</h2></Reveal><Reveal delay={0.12}><Link href="/shop" className="hidden items-center gap-2 border-b border-stone-400 pb-1 text-sm sm:flex">View all products <ArrowRight className="size-4" /></Link></Reveal></div>
          <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {products.slice(0, 4).map((product, index) => <Reveal key={product.id} delay={index * 0.08}><ProductCard product={product} priority={index < 2} /></Reveal>)}
          </div>
        </div>
      </section>

      <ScrollStory />

      <section id="makers" className="grid bg-[#5f6048] text-[#fff9ef] lg:grid-cols-2">
        <div className="relative min-h-[520px] overflow-hidden lg:min-h-[760px]">
          <Image src="https://images.unsplash.com/photo-1610701596061-2ecf227e85b2?auto=format&fit=crop&w=1500&q=90" alt="Ceramic artist shaping clay by hand" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
          <div className="absolute inset-0 bg-black/15" />
        </div>
        <div className="flex flex-col justify-between px-6 py-14 sm:px-12 lg:px-16 lg:py-20 xl:px-24">
          <Reveal><p className="text-[10px] tracking-[0.16em] text-white/55 uppercase">The people behind the objects</p><h2 className="mt-7 max-w-xl font-serif text-5xl leading-[0.98] tracking-[-0.045em] sm:text-6xl xl:text-7xl">Every piece begins with a pair of hands.</h2><p className="mt-7 max-w-lg text-sm leading-7 text-white/70 sm:text-base">We work directly with independent studios and small workshops. You meet the maker, understand the material and know where your object came from.</p></Reveal>
          <Reveal delay={0.15} className="mt-16 border-t border-white/20 pt-8"><div className="grid grid-cols-3 gap-4"><div><p className="font-serif text-2xl">Independent</p><p className="mt-2 text-[10px] tracking-[0.12em] text-white/50 uppercase">Studios</p></div><div><p className="font-serif text-2xl">Thoughtful</p><p className="mt-2 text-[10px] tracking-[0.12em] text-white/50 uppercase">Materials</p></div><div><p className="font-serif text-2xl">Maker</p><p className="mt-2 text-[10px] tracking-[0.12em] text-white/50 uppercase">Led</p></div></div><Link href="/shop" className="mt-10 inline-flex items-center gap-2 text-sm">Meet our makers <ArrowUpRight className="size-4" /></Link></Reveal>
        </div>
      </section>

      <section className="overflow-hidden border-y border-stone-300 bg-[#f7f1e7] py-5">
        <motion.div className="flex w-max items-center gap-8 font-serif text-3xl text-stone-500/80 sm:text-4xl" animate={reduceMotion ? undefined : { x: [0, -850] }} transition={{ duration: 22, repeat: Infinity, ease: "linear" }}>
          {[0, 1, 2].map((set) => <div key={set} className="flex items-center gap-8" aria-hidden={set > 0}><span>Made slowly</span><span className="text-[#9f3f2a]">✦</span><span>Chosen carefully</span><span className="text-[#9f3f2a]">✦</span><span>Kept for longer</span><span className="text-[#9f3f2a]">✦</span></div>)}
        </motion.div>
      </section>

      <section id="journal" className="px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-[1500px]"><Reveal className="flex items-end justify-between"><div><p className="text-[10px] tracking-[0.14em] text-stone-500 uppercase">Notes from Morrow</p><h2 className="mt-3 font-serif text-5xl tracking-[-0.045em] sm:text-6xl">Living with intention</h2></div><span className="hidden text-xs text-stone-500 sm:block">Stories · Homes · Materials</span></Reveal><div className="mt-12 grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
          <Reveal className="group"><div className="relative aspect-[16/9] overflow-hidden"><Image src="https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1600&q=88" alt="Calm living room with natural furniture" fill sizes="(max-width: 1024px) 100vw, 65vw" className="object-cover transition duration-700 group-hover:scale-[1.025]" /></div><p className="mt-5 text-[10px] tracking-[0.12em] text-stone-500 uppercase">Homes · 8 min read</p><h3 className="mt-2 max-w-3xl font-serif text-3xl leading-tight sm:text-4xl">A Bengaluru home shaped around light, books and things collected slowly.</h3></Reveal>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1"><Reveal delay={0.08} className="group"><div className="relative aspect-[16/8] overflow-hidden"><Image src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1000&q=88" alt="Natural materials and wooden furniture" fill sizes="(max-width: 1024px) 50vw, 35vw" className="object-cover transition duration-700 group-hover:scale-[1.025]" /></div><p className="mt-4 text-[10px] tracking-[0.12em] text-stone-500 uppercase">Materials · 5 min read</p><h3 className="mt-2 font-serif text-2xl leading-tight">Why solid wood changes as beautifully as we do.</h3></Reveal><Reveal delay={0.14} className="group"><div className="relative aspect-[16/8] overflow-hidden"><Image src="https://images.unsplash.com/photo-1567225557594-88d73e55f2cb?auto=format&fit=crop&w=1000&q=88" alt="Handmade ceramic vessels" fill sizes="(max-width: 1024px) 50vw, 35vw" className="object-cover transition duration-700 group-hover:scale-[1.025]" /></div><p className="mt-4 text-[10px] tracking-[0.12em] text-stone-500 uppercase">Makers · 6 min read</p><h3 className="mt-2 font-serif text-2xl leading-tight">Inside Asha’s small-batch pottery studio in Khurja.</h3></Reveal></div>
        </div></div>
      </section>
    </div>
  );
}
