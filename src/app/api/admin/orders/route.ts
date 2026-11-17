import { NextResponse } from "next/server";
import { handleApiError, requireRole } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";

export async function GET() {
  try {
    await requireRole(["admin"]);
    await connectDB();
    const orders = await Order.find({})
      .select("orderNumber customer items totalPaise status payment createdAt")
      .populate("customer", "name email")
      .populate("items.vendor", "name vendorProfile.storeName")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return NextResponse.json({ orders });
  } catch (error) {
    return handleApiError(error);
  }
}
