import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";
import { ShopCatalog } from "@/components/store/shop-catalog";
import { getCatalogProducts } from "@/lib/catalog";
import { categories } from "@/lib/products";

// Canonical category mapping
const CATEGORY_MAP: Record<string, (typeof categories)[number]> = {
  all: "All",
  homeware: "Homeware",
  furniture: "Furniture",
  lighting: "Lighting",
  decor: "Decor",
  textiles: "Textiles",
};

export function generateStaticParams() {
  return Object.keys(CATEGORY_MAP).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const categoryName = CATEGORY_MAP[slug.toLowerCase()];
  if (!categoryName) return { title: "Collection - Morrow" };

  return {
    title: `${categoryName} - Handcrafted Objects | Morrow`,
    description: `Explore handcrafted ${categoryName.toLowerCase()} pieces created by independent artisans and small-batch studios.`,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const categoryName = CATEGORY_MAP[slug.toLowerCase()];

  if (!categoryName) {
    notFound();
  }

  const products = await getCatalogProducts();

  return (
    <Suspense>
      <div className="mx-auto max-w-[1540px] px-5 pt-8 sm:px-8 lg:px-12">
        <nav className="flex items-center gap-2 text-xs text-stone-500" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-stone-950">
            Home
          </Link>
          <ChevronRight className="size-3 text-stone-400" />
          <Link href="/shop" className="hover:text-stone-950">
            Collection
          </Link>
          <ChevronRight className="size-3 text-stone-400" />
          <span className="text-stone-900 font-medium">{categoryName}</span>
        </nav>
      </div>
      <ShopCatalog products={products} initialCategory={categoryName} />
    </Suspense>
  );
}
