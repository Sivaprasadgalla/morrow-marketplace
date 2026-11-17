"use client";

import { useEffect, useState } from "react";
import { ArrowDownToLine, CircleDollarSign, PackageCheck, ShoppingBag } from "lucide-react";
import { DownloadVendorReport } from "@/components/dashboard/download-vendor-report";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatCurrency } from "@/lib/utils";

type Metrics = { orderCount: number; grossSalesPaise: number; payablePaise: number; units: number; activeProducts: number; lowStock: number };
const emptyMetrics: Metrics = { orderCount: 0, grossSalesPaise: 0, payablePaise: 0, units: 0, activeProducts: 0, lowStock: 0 };

export function VendorRevenue({ analytics = false }: { analytics?: boolean }) {
  const [metrics, setMetrics] = useState(emptyMetrics); const [error, setError] = useState("");
  useEffect(() => { void fetch("/api/vendor/metrics").then(async (response) => { if (!response.ok) throw new Error("Unable to load live revenue."); return response.json() as Promise<{ metrics: Metrics }>; }).then((payload) => setMetrics(payload.metrics)).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load live revenue.")); }, []);
  const commission = Math.max(0, metrics.grossSalesPaise - metrics.payablePaise);
  return <div className="mx-auto max-w-[1500px]"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-semibold tracking-[.11em] text-[#5f6048] uppercase">Vendor workspace</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.045em] sm:text-4xl">{analytics ? "Store analytics" : "Earnings & payouts"}</h1><p className="mt-2 text-sm text-stone-500">{analytics ? "Understand paid orders, stock exposure and sales performance." : "Captured sales, marketplace commission and your payable balance."}</p></div>{!analytics ? <DownloadVendorReport /> : null}</div>{error ? <p className="mt-5 border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">{error}</p> : null}<div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard label={analytics ? "Gross sales" : "Available payout"} value={formatCurrency((analytics ? metrics.grossSalesPaise : metrics.payablePaise) / 100)} change={`${metrics.orderCount} captured orders`} icon={CircleDollarSign} /><StatCard label="Units sold" value={String(metrics.units)} change={`${metrics.activeProducts} active products`} icon={ShoppingBag} /><StatCard label="Platform commission" value={formatCurrency(commission / 100)} change={metrics.grossSalesPaise ? `${Math.round((commission / metrics.grossSalesPaise) * 100)}% effective rate` : "No captured orders"} icon={ArrowDownToLine} trend="neutral" /><StatCard label="Low stock" value={String(metrics.lowStock)} change="Products at 5 units or less" icon={PackageCheck} trend={metrics.lowStock ? "down" : "neutral"} /></div><section className="mt-5 border border-stone-200 bg-[#fcfaf6] p-6"><h2 className="text-base font-semibold">{analytics ? "Revenue attributed to your store" : "Net earnings"}</h2><p className="mt-1 text-xs text-stone-500">Captured revenue after customers complete payment. Hover to inspect each week.</p><SalesChart tone="olive" /></section></div>;
}
