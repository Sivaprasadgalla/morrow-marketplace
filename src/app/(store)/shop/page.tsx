import type { Metadata } from "next";
import { Suspense } from "react";
import { ShopCatalog } from "@/components/store/shop-catalog";
import { getCatalogProducts } from "@/lib/catalog";

export const metadata: Metadata = { title: "Shop" };

export default async function ShopPage() {
  const products = await getCatalogProducts();
  return <Suspense><ShopCatalog products={products} /></Suspense>;
}
