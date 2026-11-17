"use client";

import { motion, AnimatePresence } from "motion/react";
import { LoaderCircle, ShieldCheck } from "lucide-react";

export interface FullPageLoaderProps {
  open: boolean;
  title?: string;
  message?: string;
  subtext?: string;
}

export function FullPageLoader({
  open,
  title = "Processing Order",
  message = "Please wait while we secure your pieces…",
  subtext = "Do not refresh or close this window.",
}: FullPageLoaderProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="full-page-loader"
          role="status"
          aria-live="polite"
          aria-busy="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-[#171915]/85 p-6 text-center text-[#f5efe5] backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.92, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 12, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex max-w-md flex-col items-center"
          >
            {/* Branded Ring with animated spinner */}
            <div className="relative mb-6 flex size-16 items-center justify-center">
              <span className="absolute inset-0 rounded-full border-2 border-white/10" />
              <LoaderCircle className="size-16 animate-spin text-[#d86348]" strokeWidth={1.8} />
              <span className="font-serif text-xl font-bold tracking-tight text-white select-none">M</span>
            </div>

            <p className="text-[10px] font-semibold tracking-[0.2em] text-[#d86348] uppercase">
              {title}
            </p>

            <h2 className="mt-3 font-serif text-2xl font-normal tracking-tight text-white sm:text-3xl">
              {message}
            </h2>

            {subtext && (
              <p className="mt-3 text-xs leading-relaxed text-white/60">
                {subtext}
              </p>
            )}

            <div className="mt-6 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[11px] text-white/70">
              <ShieldCheck className="size-3.5 text-emerald-400" />
              <span>256-bit encrypted secure checkout</span>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
