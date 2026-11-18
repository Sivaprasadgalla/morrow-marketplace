"use client";

import { motion, useReducedMotion } from "motion/react";

export function TextReveal({ text, className }: { text: string; className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <span className={className} aria-label={text}>
      {text.split(" ").map((word, index) => (
        <span key={`${word}-${index}`} className="mr-[0.22em] -mb-[0.18em] inline-block overflow-hidden pb-[0.18em] align-bottom last:mr-0" aria-hidden="true">
          <motion.span
            className="inline-block"
            initial={reduceMotion ? false : { y: "110%" }}
            animate={reduceMotion ? undefined : { y: 0 }}
            transition={{ duration: 0.8, delay: 0.08 + index * 0.055, ease: [0.22, 1, 0.36, 1] }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
