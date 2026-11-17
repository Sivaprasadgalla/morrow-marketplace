"use client";

import { useEffect, useState } from "react";
import { CircleDollarSign, ShieldCheck, ShoppingBag } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatCurrency } from "@/lib/utils";

type Metrics = { grossSalesPaise: number; commissionPaise: number; fulfilledItems: number; orderCount: number; refundCount: number; vendorCount: number; customerCount: number; reviewCount: number };
const emptyMetrics: Metrics = { grossSalesPaise: 0, commissionPaise: 0, fulfilledItems: 0, orderCount: 0, refundCount: 0, vendorCount: 0, customerCount: 0, reviewCount: 0 };

export function AdminReports() {
  const [metrics, setMetrics] = useState(emptyMetrics); const [error, setError] = useState("");
  useEffect(() => { void fetch("/api/admin/metrics").then(async (response) => { if (!response.ok) throw new Error("Unable to load live reporting data."); return response.json() as Promise<{ metrics: Metrics }>; }).then((payload) => setMetrics(payload.metrics)).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load live reporting data.")); }, []);
  return <div className="mx-auto max-w-[1500px]"><div><p className="text-[11px] font-semibold tracking-[.11em] text-[#91412e] uppercase">Commercial intelligence</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.045em] sm:text-4xl">Reports</h1><p className="mt-2 text-sm text-stone-500">Live captured revenue, commissions and marketplace activity.</p></div>{error ? <p className="mt-5 border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">{error}</p> : null}<div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><StatCard label="Captured gross sales" value={formatCurrency(metrics.grossSalesPaise / 100)} change={`${metrics.orderCount} paid orders`} icon={CircleDollarSign} /><StatCard label="Platform commission" value={formatCurrency(metrics.commissionPaise / 100)} change={`${metrics.reviewCount} products awaiting review`} icon={ShieldCheck} trend="neutral" /><StatCard label="Items fulfilled" value={String(metrics.fulfilledItems)} change={`${metrics.vendorCount} vendors · ${metrics.customerCount} customers`} icon={ShoppingBag} /></div><section className="mt-5 grid gap-4 border border-stone-200 bg-[#fcfaf6] p-6 sm:grid-cols-3"><div><p className="text-[10px] font-semibold tracking-[.1em] text-stone-500 uppercase">Refunded orders</p><p className="mt-3 font-serif text-4xl">{metrics.refundCount}</p></div><div><p className="text-[10px] font-semibold tracking-[.1em] text-stone-500 uppercase">Active vendors</p><p className="mt-3 font-serif text-4xl">{metrics.vendorCount}</p></div><div><p className="text-[10px] font-semibold tracking-[.1em] text-stone-500 uppercase">Active customers</p><p className="mt-3 font-serif text-4xl">{metrics.customerCount}</p></div></section></div>;
}
