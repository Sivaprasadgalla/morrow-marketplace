import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  Active: "bg-emerald-50 text-emerald-700",
  Approved: "bg-emerald-50 text-emerald-700",
  Delivered: "bg-emerald-50 text-emerald-700",
  Shipped: "bg-blue-50 text-blue-700",
  Packing: "bg-amber-50 text-amber-700",
  Pending: "bg-amber-50 text-amber-700",
  Review: "bg-violet-50 text-violet-700",
  Rejected: "bg-red-50 text-red-700",
  Low: "bg-red-50 text-red-700",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[9px] font-medium", tones[status] ?? "bg-stone-100 text-stone-600")}>{status}</span>;
}
