import { Schema, model, models } from "mongoose";

const variantSchema = new Schema(
  {
    name: { type: String, required: true },
    sku: { type: String, required: true },
    options: { type: Map, of: String, default: {} },
    pricePaise: { type: Number, required: true, min: 0 },
    compareAtPaise: { type: Number, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    reserved: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: true },
);

const productSchema = new Schema(
  {
    vendor: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    maker: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, required: true, index: true },
    productType: { type: String, enum: ["physical", "digital", "service"], default: "physical", index: true },
    fulfilment: {
      requiresShipping: { type: Boolean, default: true },
      deliveryLabel: String,
      serviceDurationMinutes: { type: Number, min: 5, max: 1440 },
    },
    materials: String,
    delivery: String,
    images: [{ type: String, required: true }],
    variants: { type: [variantSchema], required: true },
    status: {
      type: String,
      enum: ["draft", "submitted", "active", "rejected", "archived"],
      default: "draft",
      index: true,
    },
    featured: { type: Boolean, default: false, index: true },
    tags: [{ type: String, lowercase: true, trim: true }],
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    seo: {
      title: String,
      description: String,
    },
    moderation: {
      note: { type: String, maxlength: 1000 },
      reviewedAt: Date,
      reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
  },
  { timestamps: true },
);

productSchema.index({ name: "text", maker: "text", description: "text", tags: "text" });
productSchema.index({ status: 1, category: 1, createdAt: -1 });

export const ProductModel = models.Product || model("Product", productSchema);
