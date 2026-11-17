import { NextResponse } from "next/server";
import { releaseExpiredOrders } from "@/lib/order-lifecycle";

async function release(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Invalid cron authorization." }, { status: 401 });
  }
  const result = await releaseExpiredOrders(100);
  return NextResponse.json(result);
}

export const GET = release;
export const POST = release;
