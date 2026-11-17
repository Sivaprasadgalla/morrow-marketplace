import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-[color,background-color,border-color,transform,box-shadow] duration-300 outline-none focus-visible:ring-2 focus-visible:ring-[#9f3f2a] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-[#211f1a] text-[#f8f3ea] hover:bg-[#9f3f2a]",
        accent: "bg-[#9f3f2a] text-white hover:bg-[#7f3020]",
        outline: "border border-[#211f1a]/20 bg-transparent text-[#211f1a] hover:border-[#211f1a] hover:bg-white/50",
        ghost: "bg-transparent text-current hover:bg-black/[0.05]",
        inverse: "bg-[#f8f3ea] text-[#211f1a] hover:bg-white",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-3 text-xs",
        lg: "h-13 px-7",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
