import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handleApiError, requireRole, slugify } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { notifyProductSubmitted } from "@/lib/notifications";
import { ProductModel } from "@/models/Product";

const variantSchema = z.object({
  name: z.string().trim().min(1).max(80),
  sku: z.string().trim().min(2).max(40),
  options: z.record(z.string(), z.string()).default({}),
  pricePaise: z.number().int().min(0),
  compareAtPaise: z.number().int().min(0).optional(),
  stock: z.number().int().min(0),
});

const createProductSchema = z.object({
  name: z.string().trim().min(2).max(120),
  maker: z.string().trim().min(2).max(100),
  description: z.string().trim().min(30).max(4000),
  category: z.string().trim().min(2).max(80),
  productType: z.enum(["physical", "digital", "service"]).default("physical"),
  fulfilment: z.object({
    requiresShipping: z.boolean().default(true),
    deliveryLabel: z.string().trim().max(160).optional(),
    serviceDurationMinutes: z.number().int().min(5).max(1440).optional(),
  }).default({ requiresShipping: true }),
  materials: z.string().trim().max(500).optional(),
  delivery: z.string().trim().max(200).optional(),
  images: z.array(z.string().url()).min(1).max(8),
  variants: z.array(variantSchema).min(1).max(30),
  tags: z.array(z.string().trim().max(30)).max(12).default([]),
  submit: z.boolean().default(false),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const limit = Math.min(48, Math.max(1, Number(url.searchParams.get("limit") ?? 12)));
    const category = url.searchParams.get("category");
    const queryText = url.searchParams.get("q")?.trim();
    const sort = url.searchParams.get("sort") ?? "newest";
    const scope = url.searchParams.get("scope");

    await connectDB();

    const query: Record<string, unknown> = { status: "active" };
    if (scope === "mine") {
      const session = await requireRole(["vendor", "admin"]);
      delete query.status;
      if (session.user.role === "vendor") query.vendor = session.user.id;
    }
    if (category && category !== "All") query.category = category;
    if (queryText) query.$text = { $search: queryText };

    const sortOptions: Record<string, 1 | -1> =
      sort === "rating"
        ? { ratingAverage: -1, createdAt: -1 }
        : sort === "price-low"
          ? { "variants.0.pricePaise": 1 }
          : sort === "price-high"
            ? { "variants.0.pricePaise": -1 }
            : { createdAt: -1 };

    const [items, total] = await Promise.all([
      ProductModel.find(query).sort(sortOptions).skip((page - 1) * limit).limit(limit).lean(),
      ProductModel.countDocuments(query),
    ]);

    return NextResponse.json({ items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole(["vendor", "admin"]);
    const input = createProductSchema.parse(await request.json());
    await connectDB();

    const baseSlug = slugify(input.name);
    const conflicting = await ProductModel.countDocuments({ slug: new RegExp(`^${baseSlug}(?:-\\d+)?$`) });
    const slug = conflicting ? `${baseSlug}-${conflicting + 1}` : baseSlug;

    const product = await ProductModel.create({
      ...input,
      fulfilment: {
        ...input.fulfilment,
        requiresShipping: input.productType === "physical" && input.fulfilment.requiresShipping,
        ...(input.productType === "service" ? {} : { serviceDurationMinutes: undefined }),
      },
      slug,
      vendor: session.user.id,
      status: session.user.role === "admin" && input.submit ? "active" : input.submit ? "submitted" : "draft",
    });

    if (product.status === "submitted") {
      void notifyProductSubmitted(product._id.toString(), product.name, session.user.name ?? "A vendor");
    }

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === 11000) {
      return handleApiError(new ApiError(409, "A product with this slug or SKU already exists."));
    }
    return handleApiError(error);
  }
}
