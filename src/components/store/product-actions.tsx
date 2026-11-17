"use client";

import { useState } from "react";
import { Check, Heart, Minus, Plus, ShoppingBag } from "lucide-react";
import { motion } from "motion/react";
import { useCart } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { Product } from "@/lib/products";

export function ProductActions({ product }: { product: Product }) {
  const { toast } = useToast();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [saved, setSaved] = useState(() => {
    if (typeof window === "undefined") return false;
    return (JSON.parse(window.localStorage.getItem("morrow-wishlist") ?? "[]") as string[]).includes(product.id);
  });
  const productType = product.productType ?? "physical";
  const actionLabel = productType === "digital" ? "Get instant access" : productType === "service" ? "Book this service" : "Add to bag";

  const add = () => {
    const count = productType === "physical" ? quantity : 1;
    for (let index = 0; index < count; index += 1) addItem(product);
    setAdded(true);
    toast.success(`Added ${product.name} to your bag.`);
    window.setTimeout(() => setAdded(false), 1800);
  };

  const toggleSaved = () => {
    const current = JSON.parse(window.localStorage.getItem("morrow-wishlist") ?? "[]") as string[];
    const isSaved = current.includes(product.id);
    const next = isSaved ? current.filter((id) => id !== product.id) : [...current, product.id];
    window.localStorage.setItem("morrow-wishlist", JSON.stringify(next));
    setSaved(!isSaved);
    if (!isSaved) {
      toast.success(`Saved "${product.name}" to your wishlist.`);
    } else {
      toast.info(`Removed "${product.name}" from your wishlist.`);
    }
  };

  const availability = productType === "digital"
    ? "Delivered after payment"
    : productType === "service"
      ? `${product.fulfilment?.serviceDurationMinutes ?? 60}-minute service`
      : product.stock < 10 ? `Only ${product.stock} left` : "In stock";
  const delivery = product.fulfilment?.deliveryLabel ?? (productType === "physical" ? "Free delivery over ₹4,999" : "Secure checkout");

  return <div className="mt-8"><div className="flex items-center gap-3">{productType === "physical" ? <div className="flex h-12 items-center border border-stone-300"><button type="button" className="grid size-11 place-items-center" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Decrease quantity"><Minus className="size-3.5" /></button><span className="w-8 text-center text-sm">{quantity}</span><button type="button" className="grid size-11 place-items-center" onClick={() => setQuantity((value) => Math.min(product.stock, value + 1))} aria-label="Increase quantity"><Plus className="size-3.5" /></button></div> : null}<Button size="lg" className="h-12 flex-1" onClick={add}>{added ? <motion.span initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex items-center gap-2"><Check className="size-4" /> Added to bag</motion.span> : <><ShoppingBag className="size-4" /> {actionLabel}</>}</Button><Button variant="outline" size="icon" className={saved ? "size-12 border-[#91412e] text-[#91412e]" : "size-12"} onClick={toggleSaved} aria-label={saved ? "Remove saved product" : "Save product"} aria-pressed={saved}><Heart className={saved ? "size-4 fill-current" : "size-4"} /></Button></div><div className="mt-5 flex items-center justify-between text-xs text-stone-500"><span>{availability}</span><span>{delivery}</span></div></div>;
}
