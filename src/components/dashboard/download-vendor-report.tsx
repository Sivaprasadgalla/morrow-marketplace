"use client";

import { ArrowDownToLine } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DownloadVendorReport() {
  function download() {
    const csv = 'Metric,Value\n"Available payout","₹68,240"\n"Paid this month","₹2.16L"\n"Commission","12%"';
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `morrow-vendor-report-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return <Button onClick={download}><ArrowDownToLine className="size-4" /> Export report</Button>;
}
