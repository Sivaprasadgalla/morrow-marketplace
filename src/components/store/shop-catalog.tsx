"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Reveal } from "@/components/motion/reveal";
import { ProductCard } from "@/components/store/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { categories, type Product } from "@/lib/products";
import { cn } from "@/lib/utils";

const CATEGORY_EDITORIAL: Record<string, { title: string; description: string }> = {
  All: {
    title: "Objects for living",
    description:
      "Pieces selected for material integrity, thoughtful making and the quiet pleasure of everyday use.",
  },
  Homeware: {
    title: "Homeware & Table",
    description:
      "Tactile stoneware, hand-thrown ceramics, and tableware crafted for unhurried gatherings.",
  },
  Furniture: {
    title: "Living & Studio Furniture",
    description:
      "Low, generous seating, tables, and benches built with solid hardwoods and handwoven cane.",
  },
  Lighting: {
    title: "Atmospheric Lighting",
    description:
      "Warm, sculptural illumination crafted from hand-hammered brass, paper, and terracotta.",
  },
  Decor: {
    title: "Contemplative Objects",
    description:
      "Sculptural vessels, hand-carved accents, and tactile forms that ground everyday spaces.",
  },
  Textiles: {
    title: "Handloom Textiles",
    description:
      "Hand-spun throws, artisanal linens, and cushions shaped for enduring comfort and warmth.",
  },
};

export function ShopCatalog({
  products,
  initialCategory,
}: {
  products: Product[];
  initialCategory?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [category, setCategory] = useState(
    initialCategory ?? searchParams.get("category") ?? "All",
  );
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState(searchParams.get("sort") ?? "featured");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filtered = useMemo(() => {
    const items = products.filter((product) => {
      const matchesCategory = category === "All" || product.category === category;
      const haystack = `${product.name} ${product.maker} ${product.category}`.toLowerCase();
      return matchesCategory && haystack.includes(query.toLowerCase());
    });
    return [...items].sort((a, b) => {
      if (sort === "price-low") return a.price - b.price;
      if (sort === "price-high") return b.price - a.price;
      if (sort === "rating") return b.rating - a.rating;
      if (sort === "newest") return Number(Boolean(b.isNew)) - Number(Boolean(a.isNew));
      return Number(Boolean(b.bestseller)) - Number(Boolean(a.bestseller));
    });
  }, [category, products, query, sort]);

  const handleSelectCategory = (item: (typeof categories)[number]) => {
    setCategory(item);
    if (item === "All") {
      router.push("/shop");
    } else {
      router.push(`/category/${item.toLowerCase()}`);
    }
  };

  const editorial = CATEGORY_EDITORIAL[category] ?? CATEGORY_EDITORIAL.All;

  return (
    <div className="mx-auto max-w-[1540px] px-5 pb-24 pt-8 sm:px-8 lg:px-12 lg:pt-14">
      <Reveal className="grid gap-8 border-b border-stone-300 pb-12 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-[10px] tracking-[0.14em] text-stone-500 uppercase">
            {category === "All" ? "The collection" : `Category · ${category}`}
          </p>
          <h1 className="mt-3 font-serif text-6xl tracking-[-0.055em] sm:text-7xl lg:text-8xl">
            {editorial.title}
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-6 text-stone-600">{editorial.description}</p>
        </div>
        <p className="text-xs text-stone-500">{filtered.length} pieces</p>
      </Reveal>

      <div className="sticky top-[72px] z-30 -mx-5 mt-0 flex items-center justify-between gap-4 border-b border-stone-300 bg-[#f6f1e8]/95 px-5 py-4 backdrop-blur-xl sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12">
        <div className="hidden items-center gap-6 lg:flex">
          {categories.map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => handleSelectCategory(item)}
              className={cn(
                "relative py-2 text-xs transition after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-[#9f3f2a] after:transition-transform",
                category === item
                  ? "text-[#9f3f2a] after:scale-x-100"
                  : "text-stone-600 after:scale-x-0 hover:text-stone-950",
              )}
            >
              {item}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="lg:hidden"
          onClick={() => setFiltersOpen(true)}
        >
          <SlidersHorizontal className="size-4" /> Filters
        </Button>
        <div className="flex items-center gap-3">
          <label className="relative hidden sm:block">
            <span className="sr-only">Search products</span>
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search this collection"
              className="h-9 w-56 border-0 border-b border-stone-300 bg-transparent pl-9 focus:ring-0 text-xs"
            />
          </label>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="h-9 border-0 bg-transparent pr-2 text-xs outline-none cursor-pointer"
          >
            <option value="featured">Featured</option>
            <option value="newest">Newest</option>
            <option value="rating">Highest rated</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
          </select>
        </div>
      </div>

      {filtered.length ? (
        <div className="mt-10 grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product, index) => (
            <Reveal key={product.id} delay={(index % 4) * 0.055}>
              <ProductCard product={product} priority={index < 4} />
            </Reveal>
          ))}
        </div>
      ) : (
        <div className="grid min-h-[420px] place-items-center text-center">
          <div>
            <p className="font-serif text-4xl">Nothing found</p>
            <p className="mt-2 text-sm text-stone-500">Try another category or search term.</p>
            <Button
              variant="outline"
              className="mt-5"
              onClick={() => {
                handleSelectCategory("All");
                setQuery("");
              }}
            >
              Clear filters
            </Button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {filtersOpen ? (
          <motion.div
            className="fixed inset-0 z-[80] bg-[#f8f3ea] p-6 lg:hidden"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-between">
              <p className="font-serif text-3xl">Filter collection</p>
              <button
                type="button"
                className="grid size-11 place-items-center"
                onClick={() => setFiltersOpen(false)}
                aria-label="Close filters"
              >
                <X />
              </button>
            </div>
            <div className="mt-12 flex flex-col items-start gap-5">
              {categories.map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => {
                    handleSelectCategory(item);
                    setFiltersOpen(false);
                  }}
                  className={cn(
                    "font-serif text-4xl",
                    category === item && "text-[#9f3f2a]",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
