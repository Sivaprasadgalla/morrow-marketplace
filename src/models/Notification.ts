import { Schema, model, models } from "mongoose";

const notificationSchema = new Schema(
  {
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: [
        "order.placed",
        "order.paid",
        "order.cancelled",
        "order.shipped",
        "order.delivered",
        "product.submitted",
        "product.approved",
        "product.rejected",
        "user.registered",
        "user.role_changed",
        "stock.low",
      ],
      index: true,
    },
    title: { type: String, required: true, maxlength: 200 },
    message: { type: String, required: true, maxlength: 500 },
    href: String,
    read: { type: Boolean, default: false, index: true },
    readAt: Date,
    entityType: { type: String, enum: ["Order", "Product", "User"] },
    entityId: String,
    actor: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const Notification = models.Notification || model("Notification", notificationSchema);
