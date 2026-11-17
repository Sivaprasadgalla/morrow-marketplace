import { Schema, model, models } from "mongoose";

const orderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    vendor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    variantId: { type: Schema.Types.ObjectId, required: true },
    productName: { type: String, required: true },
    variantName: { type: String, required: true },
    sku: { type: String, required: true },
    image: String,
    productType: { type: String, enum: ["physical", "digital", "service"], default: "physical" },
    requiresShipping: { type: Boolean, default: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPricePaise: { type: Number, required: true, min: 0 },
    taxPaise: { type: Number, required: true, min: 0 },
    lineTotalPaise: { type: Number, required: true, min: 0 },
    commissionPaise: { type: Number, required: true, min: 0 },
    vendorPayablePaise: { type: Number, required: true, min: 0 },
    fulfilmentStatus: {
      type: String,
      enum: ["pending", "accepted", "packed", "shipped", "delivered", "cancelled", "returned"],
      default: "pending",
    },
    trackingNumber: String,
    deliveredAt: Date,
  },
  { _id: true },
);

const addressSnapshotSchema = new Schema(
  {
    name: String,
    phone: String,
    line1: String,
    line2: String,
    city: String,
    state: String,
    postalCode: String,
    country: { type: String, default: "India" },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    customer: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    source: { type: String, enum: ["checkout", "manual"], default: "checkout", index: true },
    createdByVendor: { type: Schema.Types.ObjectId, ref: "User" },
    items: { type: [orderItemSchema], required: true },
    shippingAddress: { type: addressSnapshotSchema, required: true },
    subtotalPaise: { type: Number, required: true, min: 0 },
    discountPaise: { type: Number, default: 0, min: 0 },
    shippingPaise: { type: Number, default: 0, min: 0 },
    taxPaise: { type: Number, required: true, min: 0 },
    totalPaise: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["awaiting_payment", "paid", "processing", "partially_shipped", "shipped", "delivered", "cancelled", "refunded"],
      default: "awaiting_payment",
      index: true,
    },
    payment: {
      provider: { type: String, default: "razorpay" },
      providerOrderId: String,
      providerPaymentId: String,
      status: { type: String, enum: ["pending", "authorized", "captured", "failed", "refunded"], default: "pending" },
      paidAt: Date,
    },
    paymentExpiresAt: { type: Date, index: true },
    inventoryReleaseClaimedAt: Date,
    inventoryReleasedAt: Date,
    notifications: {
      confirmationClaimedAt: Date,
      confirmationSentAt: Date,
    },
    couponCode: String,
  },
  { timestamps: true },
);

orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ "items.vendor": 1, createdAt: -1 });

export const Order = models.Order || model("Order", orderSchema);
