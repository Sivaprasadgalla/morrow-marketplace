import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight, ShieldCheck, Star, Truck } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { ProductActions } from "@/components/store/product-actions";
import { ProductCard } from "@/components/store/product-card";
import { ProductGallery } from "@/components/store/product-gallery";
import { getCatalogProducts, getProductBySlug } from "@/lib/catalog";
import { formatCurrency } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return product ? { title: product.name, description: product.description } : { title: "Product" };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const catalog = await getCatalogProducts();
  const related = catalog.filter((item) => item.id !== product.id && (item.category === product.category || item.maker === product.maker)).slice(0, 3);

  const productImages =
    product.images && product.images.length > 0
      ? product.images
      : [product.image, product.secondaryImage].filter(Boolean);

  return (
    <div className="mx-auto max-w-[1540px] px-5 pb-24 pt-6 sm:px-8 lg:px-12">
      <nav className="flex items-center gap-2 py-4 text-xs text-stone-500" aria-label="Breadcrumb">
        <Link href="/shop" className="hover:text-stone-950 inline-flex items-center gap-1.5">
          <ArrowLeft className="size-3.5" /> Collection
        </Link>
        <ChevronRight className="size-3 text-stone-400" />
        <Link href={`/category/${product.category.toLowerCase()}`} className="hover:text-stone-950">
          {product.category}
        </Link>
        <ChevronRight className="size-3 text-stone-400" />
        <span className="text-stone-900 truncate max-w-xs">{product.name}</span>
      </nav>

      <div className="mt-3 grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-14 items-start">
        <div className="max-w-xl mx-auto lg:max-w-none w-full">
          <ProductGallery
            images={productImages}
            productName={product.name}
            maker={product.maker}
          />
          <div className="mt-5 relative overflow-hidden bg-[#8f321f] p-6 text-[#fff8ee]">
            <p className="text-[10px] tracking-[0.14em] text-white/55 uppercase">Made by hand</p>
            <p className="mt-1.5 font-serif text-xl leading-tight">
              Small variations in texture and finish are part of what makes every piece yours.
            </p>
          </div>
        </div>

        <Reveal delay={0.12} className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-[10px] font-medium tracking-[0.14em] text-stone-500 uppercase">
            {product.maker} · {product.category}
          </p>
          <h1 className="mt-4 font-serif text-5xl leading-[0.96] tracking-[-0.045em] sm:text-6xl">
            {product.name}
          </h1>
          <div className="mt-5 flex items-center justify-between">
            <p className="text-xl font-medium">{formatCurrency(product.price)}</p>
            <span className="flex items-center gap-1 text-xs">
              <Star className="size-3.5 fill-current text-amber-600" /> {product.rating} ({product.reviews})
            </span>
          </div>
          <p className="mt-8 border-t border-stone-300 pt-7 text-sm leading-7 text-stone-600">
            {product.description}
          </p>
          <ProductActions product={product} />
          <div className="mt-8 divide-y divide-stone-300 border-y border-stone-300">
            <div className="grid grid-cols-[24px_1fr] gap-3 py-4">
              <Truck className="size-4 text-stone-700" />
              <div>
                <p className="text-xs font-medium">Delivery</p>
                <p className="mt-1 text-xs text-stone-500">{product.delivery}</p>
              </div>
            </div>
            <div className="grid grid-cols-[24px_1fr] gap-3 py-4">
              <ShieldCheck className="size-4 text-stone-700" />
              <div>
                <p className="text-xs font-medium">Materials & care</p>
                <p className="mt-1 text-xs text-stone-500">{product.materials}</p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      {related.length ? (
        <section className="mt-28">
          <Reveal>
            <p className="text-[10px] tracking-[0.14em] text-stone-500 uppercase">Continue exploring</p>
            <h2 className="mt-3 font-serif text-5xl tracking-[-0.04em]">You may also like</h2>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item, index) => (
              <Reveal key={item.id} delay={index * 0.08}>
                <ProductCard product={item} />
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
