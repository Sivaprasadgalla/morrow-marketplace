import { Schema, model, models } from "mongoose";

const authTokenSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    type: { type: String, enum: ["verify_email", "reset_password"], required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true },
);

authTokenSchema.index({ user: 1, type: 1 });

export const AuthToken = models.AuthToken || model("AuthToken", authTokenSchema);
