import { cn } from "@/lib/utils";

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  return (
    <span
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full bg-[#d8c6aa] text-xs font-semibold text-[#302a22]",
        className,
      )}
      aria-label={name}
    >
      {initials}
    </span>
  );
}
