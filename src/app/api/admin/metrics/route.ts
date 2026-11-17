import { NextResponse } from "next/server";
import { handleApiError, requireRole } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { ProductModel } from "@/models/Product";
import { User } from "@/models/User";

export async function GET() {
  try {
    await requireRole(["admin"]);
    await connectDB();
    const [revenue, refundCount, vendorCount, customerCount, reviewCount] = await Promise.all([
      Order.aggregate([
        { $match: { "payment.status": "captured" } },
        { $unwind: "$items" },
        { $group: { _id: null, grossSalesPaise: { $sum: "$items.lineTotalPaise" }, commissionPaise: { $sum: "$items.commissionPaise" }, fulfilledItems: { $sum: "$items.quantity" }, orderIds: { $addToSet: "$_id" } } },
        { $project: { _id: 0, grossSalesPaise: 1, commissionPaise: 1, fulfilledItems: 1, orderCount: { $size: "$orderIds" } } },
      ]),
      Order.countDocuments({ status: "refunded" }),
      User.countDocuments({ role: "vendor", status: "active" }),
      User.countDocuments({ role: "customer", status: "active" }),
      ProductModel.countDocuments({ status: "submitted" }),
    ]);
    return NextResponse.json({ metrics: { ...(revenue[0] ?? { grossSalesPaise: 0, commissionPaise: 0, fulfilledItems: 0, orderCount: 0 }), refundCount, vendorCount, customerCount, reviewCount } });
  } catch (error) {
    return handleApiError(error);
  }
}
