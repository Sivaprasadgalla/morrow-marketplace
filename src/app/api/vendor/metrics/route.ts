import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { handleApiError, requireRole } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { ProductModel } from "@/models/Product";

export async function GET() {
  try {
    const session = await requireRole(["vendor", "admin"]);
    await connectDB();
    const vendorId = new Types.ObjectId(session.user.id);

    const [orderMetrics, activeProducts, lowStock] = await Promise.all([
      Order.aggregate([
        { $unwind: "$items" },
        { $match: { "items.vendor": vendorId, "payment.status": "captured" } },
        {
          $group: {
            _id: null,
            orders: { $addToSet: "$_id" },
            grossSalesPaise: { $sum: { $multiply: ["$items.unitPricePaise", "$items.quantity"] } },
            payablePaise: { $sum: "$items.vendorPayablePaise" },
            units: { $sum: "$items.quantity" },
          },
        },
        { $project: { _id: 0, orderCount: { $size: "$orders" }, grossSalesPaise: 1, payablePaise: 1, units: 1 } },
      ]),
      ProductModel.countDocuments({ vendor: vendorId, status: "active" }),
      ProductModel.countDocuments({ vendor: vendorId, variants: { $elemMatch: { stock: { $lte: 5 } } } }),
    ]);

    return NextResponse.json({
      metrics: { ...(orderMetrics[0] ?? { orderCount: 0, grossSalesPaise: 0, payablePaise: 0, units: 0 }), activeProducts, lowStock },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
