"use client";

import { motion } from "motion/react";

const values = [42, 55, 48, 64, 61, 72, 68, 79, 74, 88, 84, 96];

export function SalesChart({ tone = "rust" }: { tone?: "rust" | "olive" }) {
  return <div className="flex h-56 items-end gap-2 border-b border-stone-200 pt-10" aria-label="Twelve-week sales chart">{values.map((value, index) => <div key={index} className="group relative flex h-full min-w-0 flex-1 cursor-pointer items-end"><motion.div className={tone === "rust" ? "w-full origin-bottom bg-[#a7462f] transition-colors group-hover:bg-[#762d1e]" : "w-full origin-bottom bg-[#686b4f] transition-colors group-hover:bg-[#41452f]"} initial={{ height: 0 }} whileInView={{ height: `${value}%` }} viewport={{ once: true }} whileHover={{ scaleX: 1.08 }} transition={{ duration: 0.65, delay: index * 0.035, ease: [0.22, 1, 0.36, 1] }} /><span style={{ bottom: `calc(${value}% + 8px)` }} className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 translate-y-1 rounded-full bg-[#20221e] px-2.5 py-1.5 text-[11px] font-semibold whitespace-nowrap text-white opacity-0 shadow-lg transition duration-200 group-hover:translate-y-0 group-hover:opacity-100">₹{(value * 2.8).toFixed(0)}k</span><span className="sr-only">Week {index + 1}: ₹{(value * 2.8).toFixed(0)} thousand</span></div>)}</div>;
}
