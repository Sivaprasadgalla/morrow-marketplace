import { connectDB } from "@/lib/db";
import type { Product } from "@/lib/products";
import { ProductModel } from "@/models/Product";

type CatalogDocument = {
  _id: { toString(): string };
  slug: string;
  name: string;
  maker: string;
  category: Product["category"];
  productType?: Product["productType"];
  fulfilment?: Product["fulfilment"];
  description: string;
  materials?: string;
  delivery?: string;
  images?: string[];
  variants?: Array<{
    _id: { toString(): string };
    pricePaise: number;
    compareAtPaise?: number;
    stock: number;
  }>;
  ratingAverage?: number;
  ratingCount?: number;
  tags?: string[];
  featured?: boolean;
};

function mapProduct(document: CatalogDocument): Product {
  const variant = document.variants?.[0];
  const allImages = Array.isArray(document.images) && document.images.length > 0 ? document.images : [];
  return {
    id: document._id.toString(),
    variantId: variant?._id?.toString(),
    slug: document.slug,
    name: document.name,
    maker: document.maker,
    category: document.category,
    productType: document.productType ?? "physical",
    fulfilment: document.fulfilment,
    price: Math.round((variant?.pricePaise ?? 0) / 100),
    compareAt: variant?.compareAtPaise ? Math.round(variant.compareAtPaise / 100) : undefined,
    rating: document.ratingAverage ?? 0,
    reviews: document.ratingCount ?? 0,
    stock: variant?.stock ?? 0,
    image: allImages[0] ?? "",
    secondaryImage: allImages[1] ?? allImages[0] ?? "",
    images: allImages,
    description: document.description,
    materials: document.materials ?? "See care instructions supplied by the maker.",
    delivery: document.delivery ?? "Dispatches in 3–5 business days",
    isNew: document.tags?.includes("new"),
    bestseller: Boolean(document.featured),
  };
}

export async function getCatalogProducts(): Promise<Product[]> {
  try {
    await connectDB();
    const documents = await ProductModel.find({ status: "active" }).sort({ featured: -1, createdAt: -1 }).lean();
    return documents.map((document) => mapProduct(document as unknown as CatalogDocument));
  } catch {
    return [];
  }
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  try {
    await connectDB();
    const document = await ProductModel.findOne({ slug, status: "active" }).lean();
    if (document) return mapProduct(document as unknown as CatalogDocument);
  } catch {
    return undefined;
  }
  return undefined;
}
