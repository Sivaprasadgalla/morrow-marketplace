import { Schema, model, models } from "mongoose";

const inventoryMovementSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    variantId: { type: Schema.Types.ObjectId, required: true },
    vendor: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["opening", "adjustment", "reservation", "sale", "release", "return"], required: true },
    quantityDelta: { type: Number, required: true },
    referenceType: String,
    referenceId: String,
    reason: String,
    actor: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

inventoryMovementSchema.index({ product: 1, variantId: 1, createdAt: -1 });

export const InventoryMovement = models.InventoryMovement || model("InventoryMovement", inventoryMovementSchema);
