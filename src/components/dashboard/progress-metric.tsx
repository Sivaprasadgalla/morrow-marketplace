"use client";

import { motion } from "motion/react";

export function ProgressMetric({ label, value, tone = "positive" }: { label: string; value: number; tone?: "positive" | "warning" | "neutral" }) {
  const bar = tone === "warning" ? "bg-[#c17b28]" : tone === "neutral" ? "bg-[#6c6f55]" : "bg-[#39725c]";
  const text = tone === "warning" ? "text-[#9a5c14]" : tone === "neutral" ? "text-[#5f6048]" : "text-[#27604b]";
  return <div className="group cursor-default"><div className="flex items-center justify-between gap-4 text-xs"><span className="font-medium text-stone-700">{label}</span><span className={`font-semibold tabular-nums ${text}`}>{value}%</span></div><div className="relative mt-3 h-2.5 overflow-visible rounded-full bg-stone-200/70"><motion.div className={`relative h-full rounded-full ${bar} ${text}`} initial={{ width: 0 }} whileInView={{ width: `${value}%` }} viewport={{ once: true }} transition={{ duration: .9, ease: [0.22, 1, 0.36, 1] }}><span className="absolute right-0 top-1/2 size-3 -translate-y-1/2 translate-x-1/2 rounded-full border-2 border-white bg-current shadow-sm" /><span className="pointer-events-none absolute -right-4 -top-10 rounded-full bg-[#20221e] px-2.5 py-1 text-[11px] font-semibold tabular-nums text-white opacity-0 shadow-lg transition group-hover:-translate-y-1 group-hover:opacity-100">{value}%</span></motion.div></div></div>;
}
