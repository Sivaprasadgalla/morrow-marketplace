import { Schema, model, models } from "mongoose";

const paymentEventSchema = new Schema(
  {
    provider: { type: String, default: "razorpay" },
    providerEventId: { type: String, required: true, unique: true },
    eventType: { type: String, required: true },
    order: { type: Schema.Types.ObjectId, ref: "Order" },
    payload: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: ["received", "processed", "ignored", "failed"], default: "received" },
    error: String,
    processedAt: Date,
  },
  { timestamps: true },
);

export const PaymentEvent = models.PaymentEvent || model("PaymentEvent", paymentEventSchema);
