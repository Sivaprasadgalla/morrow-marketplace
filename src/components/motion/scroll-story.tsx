"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

const moments = [
  { number: "01", title: "Notice the material", copy: "Clay with a visible hand. Wood with its grain intact. Linen that becomes softer in use.", image: "https://images.unsplash.com/photo-1549497538-303791108f95?auto=format&fit=crop&w=1500&q=88" },
  { number: "02", title: "Know the maker", copy: "Every collection begins with a studio, a region and a person whose practice informs the object.", image: "https://images.unsplash.com/photo-1545138694-3a8e2d6f21f3?auto=format&fit=crop&w=1500&q=88" },
  { number: "03", title: "Keep it close", copy: "We choose pieces with the patience to outlast a season—and the character to get better with time.", image: "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1500&q=88" },
];

export function ScrollStory() {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const lineScale = useTransform(scrollYProgress, [0.15, 0.78], [0, 1]);

  return <section ref={ref} className="relative overflow-hidden bg-[#e9dfd0] px-5 py-24 sm:px-8 lg:px-12 lg:py-36"><div className="mx-auto max-w-[1500px]"><div className="grid gap-7 border-b border-[#211f1a]/15 pb-10 lg:grid-cols-[.8fr_1.2fr] lg:items-end"><p className="text-[11px] font-semibold tracking-[.14em] text-[#91412e] uppercase">A slower way to shop</p><h2 className="max-w-4xl font-serif text-5xl leading-[.94] tracking-[-.055em] sm:text-7xl">Let the objects unfold as you move.</h2></div><div className="relative mt-12 lg:mt-16"><motion.div style={reduceMotion ? undefined : { scaleY: lineScale }} className="absolute bottom-0 left-[11px] top-0 hidden w-px origin-top bg-[#91412e] lg:block" />{moments.map((moment, index) => <StoryMoment key={moment.number} moment={moment} index={index} />)}</div><div className="mt-14 flex justify-end"><Link href="/shop" className="group inline-flex items-center gap-3 border-b border-[#211f1a] pb-2 text-sm font-semibold">Explore the full collection <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1" /></Link></div></div></section>;
}

function StoryMoment({ moment, index }: { moment: typeof moments[number]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const imageScale = useTransform(scrollYProgress, [0, .5, 1], [1.12, 1, .96]);
  const contentY = useTransform(scrollYProgress, [0, .5], [34, 0]);
  return <div ref={ref} className="relative grid gap-7 py-9 lg:grid-cols-[48px_.72fr_1.05fr] lg:gap-12 lg:py-16"><div className="relative z-10 flex items-start"><span className="grid size-[23px] place-items-center rounded-full border border-[#91412e] bg-[#e9dfd0] text-[9px] font-bold text-[#91412e]">{moment.number}</span></div><motion.div style={reduceMotion ? undefined : { y: contentY }} className="self-center lg:py-8"><p className="font-serif text-4xl leading-[.98] tracking-[-.04em] sm:text-5xl">{moment.title}</p><p className="mt-5 max-w-md text-sm leading-7 text-stone-600 sm:text-base">{moment.copy}</p></motion.div><div className="relative aspect-[16/10] overflow-hidden bg-stone-300"><motion.div className="absolute inset-[-8%]" style={reduceMotion ? undefined : { scale: imageScale }}><Image src={moment.image} alt="" fill sizes="(max-width: 1024px) 100vw, 55vw" className="object-cover" priority={index === 0} /></motion.div><div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" /></div></div>;
}
