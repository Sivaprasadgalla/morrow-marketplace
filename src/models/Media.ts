import { Schema, model, models } from "mongoose";

const mediaSchema = new Schema(
  {
    vendor: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    vendorName: { type: String, required: true, trim: true },
    vendorFolder: { type: String, required: true, trim: true, index: true },
    url: { type: String, required: true },
    secureUrl: { type: String, required: true },
    publicId: { type: String, required: true, index: true },
    originalFilename: { type: String, default: "" },
    format: { type: String, default: "" },
    bytes: { type: Number, default: 0 },
    width: { type: Number },
    height: { type: Number },
    resourceType: { type: String, default: "image" },
    altText: { type: String, default: "" },
    tags: [{ type: String, lowercase: true, trim: true }],
  },
  { timestamps: true },
);

mediaSchema.index({ vendor: 1, createdAt: -1 });

export const MediaModel = models.Media || model("Media", mediaSchema);
