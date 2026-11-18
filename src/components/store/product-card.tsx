"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { Heart, Plus } from "lucide-react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/components/cart/cart-provider";
import type { Product } from "@/lib/products";
import { formatCurrency } from "@/lib/utils";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { addItem, isReady } = useCart();
  const pointerX = useMotionValue(0.5);
  const pointerY = useMotionValue(0.5);
  const rotateY = useSpring(useTransform(pointerX, [0, 1], [-2.2, 2.2]), { stiffness: 180, damping: 25 });
  const rotateX = useSpring(useTransform(pointerY, [0, 1], [2.2, -2.2]), { stiffness: 180, damping: 25 });

  return (
    <motion.article
      ref={ref}
      className="group [perspective:1000px]"
      style={reduceMotion ? undefined : { rotateX, rotateY }}
      onPointerMove={(event) => {
        if (reduceMotion || event.pointerType === "touch") return;
        const bounds = ref.current?.getBoundingClientRect();
        if (!bounds) return;
        pointerX.set((event.clientX - bounds.left) / bounds.width);
        pointerY.set((event.clientY - bounds.top) / bounds.height);
      }}
      onPointerLeave={() => {
        pointerX.set(0.5);
        pointerY.set(0.5);
      }}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-[#e7dece]">
        <Link href={`/product/${product.slug}`} className="absolute inset-0 z-0" aria-label={`View ${product.name}`}>
          <Image
            src={product.image}
            alt={product.name}
            fill
            priority={priority}
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 25vw"
            className="object-cover transition duration-700 ease-out group-hover:scale-[1.035] group-hover:opacity-0"
          />
          <Image
            src={product.secondaryImage}
            alt=""
            fill
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 25vw"
            className="object-cover opacity-0 transition duration-700 ease-out group-hover:scale-[1.035] group-hover:opacity-100"
          />
        </Link>
        <div className="absolute left-3 top-3 flex gap-2">
          {product.isNew ? <Badge>New</Badge> : null}
          {product.bestseller ? <Badge>Bestseller</Badge> : null}
        </div>
        <button
          type="button"
          aria-label={`Save ${product.name}`}
          className="absolute right-3 top-3 z-10 grid size-10 place-items-center rounded-full bg-white/85 text-stone-800 backdrop-blur transition hover:scale-105 hover:bg-white"
        >
          <Heart className="size-4" strokeWidth={1.6} />
        </button>
        <button
          type="button"
          disabled={!isReady || product.stock < 1}
          onClick={() => addItem(product)}
          className="absolute inset-x-3 bottom-3 z-10 flex translate-y-3 items-center justify-center gap-2 bg-[#211f1a] px-4 py-3 text-xs font-medium text-white opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100"
        >
          <Plus className="size-4" /> Add to bag
        </button>
      </div>
      <div className="flex items-start justify-between gap-3 py-4">
        <div>
          <p className="text-[10px] font-medium tracking-[0.13em] text-stone-500 uppercase">{product.maker}</p>
          <Link href={`/product/${product.slug}`} className="mt-1.5 block font-serif text-xl leading-tight hover:text-[#9f3f2a]">
            {product.name}
          </Link>
        </div>
        <div className="shrink-0 text-right text-sm">
          <span>{formatCurrency(product.price)}</span>
          {product.compareAt ? <span className="ml-1 text-stone-400 line-through">{formatCurrency(product.compareAt)}</span> : null}
        </div>
      </div>
    </motion.article>
  );
}
