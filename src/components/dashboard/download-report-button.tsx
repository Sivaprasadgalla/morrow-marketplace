"use client";

import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DownloadReportButton() {
  function download() {
    const rows = [["Metric", "Value"], ["Net platform revenue", "₹5.82L"], ["Refund rate", "2.4%"], ["Orders fulfilled", "1,142"]];
    const blob = new Blob([rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `morrow-platform-report-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return <Button onClick={download}><FileDown className="size-4" /> Export CSV</Button>;
}
