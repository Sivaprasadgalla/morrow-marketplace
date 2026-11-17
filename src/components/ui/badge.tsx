import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full border border-current/15 bg-white/75 px-2.5 py-1 text-[10px] font-medium tracking-[0.08em] uppercase backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  );
}
