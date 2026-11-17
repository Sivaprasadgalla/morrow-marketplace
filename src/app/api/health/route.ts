import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  let database: "ready" | "unavailable" = "unavailable";
  let databaseError: string | undefined;
  try {
    const connection = await connectDB();
    await connection.connection.db?.command({ ping: 1 });
    database = "ready";
  } catch (error) {
    databaseError = error instanceof Error ? error.message : "Database connection failed.";
  }

  const checks = {
    database,
    email: (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) || (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) ? "configured" : "not_configured",
    payments: process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET ? "configured" : "demo_mode",
    webhook: process.env.RAZORPAY_WEBHOOK_SECRET ? "configured" : "not_configured",
    cron: process.env.CRON_SECRET ? "configured" : "not_configured",
  };
  return NextResponse.json({ status: database === "ready" ? "ready" : "degraded", checks, ...(databaseError ? { databaseError } : {}) }, { status: database === "ready" ? 200 : 503 });
}
