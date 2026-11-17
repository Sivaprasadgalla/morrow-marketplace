import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatApiErrorMessage(data: unknown, fallback = "Action failed."): string {
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (data instanceof Error) return data.message;
  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (obj.details && typeof obj.details === "object") {
      const details = obj.details as Record<string, unknown>;
      if (details.fieldErrors && typeof details.fieldErrors === "object") {
        const fieldErrors = details.fieldErrors as Record<string, string[]>;
        const parts = Object.entries(fieldErrors)
          .filter(([, msgs]) => Array.isArray(msgs) && msgs.length > 0)
          .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`);
        if (parts.length > 0) {
          const main = typeof obj.error === "string" ? obj.error : "Validation error";
          return `${main} (${parts.join(" · ")})`;
        }
      }
      if (typeof details.message === "string") {
        return details.message;
      }
    }
    if (typeof obj.error === "string" && obj.error) {
      return obj.error;
    }
    if (typeof obj.message === "string" && obj.message) {
      return obj.message;
    }
  }
  return fallback;
}
