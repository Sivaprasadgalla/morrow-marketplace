import { Schema, model, models } from "mongoose";

const addressSchema = new Schema(
  {
    label: { type: String, default: "Home" },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    line2: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, default: "India" },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true },
);

const vendorProfileSchema = new Schema(
  {
    storeName: String,
    storeSlug: { type: String, lowercase: true, trim: true },
    description: String,
    verified: { type: Boolean, default: false },
    commissionRateBps: { type: Number, default: 1200, min: 0, max: 10000 },
    payoutAccountId: String,
    onboardingStatus: {
      type: String,
      enum: ["draft", "submitted", "approved", "rejected"],
      default: "draft",
    },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    emailVerified: Date,
    image: String,
    passwordHash: { type: String, select: false },
    passwordChangedAt: Date,
    role: { type: String, enum: ["customer", "vendor", "admin"], default: "customer", index: true },
    status: { type: String, enum: ["active", "suspended", "pending"], default: "active", index: true },
    phone: String,
    addresses: [addressSchema],
    vendorProfile: vendorProfileSchema,
    lastLoginAt: Date,
    deletedAt: Date,
  },
  { timestamps: true },
);

userSchema.index({ "vendorProfile.storeSlug": 1 }, { unique: true, sparse: true });

export const User = models.User || model("User", userSchema);
