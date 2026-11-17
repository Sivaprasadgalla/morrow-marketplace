"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

export type ToastType = "success" | "error" | "info" | "warning";

export type ToastItem = {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
};

type ToastContextType = {
  toast: {
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
  };
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

const icons: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const toneStyles: Record<
  ToastType,
  { bg: string; border: string; text: string; icon: string }
> = {
  success: {
    bg: "bg-[#f5f9f3]",
    border: "border-emerald-300",
    text: "text-emerald-950",
    icon: "text-emerald-700",
  },
  error: {
    bg: "bg-[#fdf3f2]",
    border: "border-red-300",
    text: "text-red-950",
    icon: "text-red-700",
  },
  warning: {
    bg: "bg-[#fff9eb]",
    border: "border-amber-300",
    text: "text-amber-950",
    icon: "text-amber-700",
  },
  info: {
    bg: "bg-[#f4f7fa]",
    border: "border-blue-300",
    text: "text-blue-950",
    icon: "text-blue-700",
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, title?: string, duration = 4500) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, title, message, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }
    },
    [dismiss],
  );

  const toast = React.useMemo(
    () => ({
      success: (message: string, title?: string) => addToast("success", message, title),
      error: (message: string, title?: string) => addToast("error", message, title),
      info: (message: string, title?: string) => addToast("info", message, title),
      warning: (message: string, title?: string) => addToast("warning", message, title),
    }),
    [addToast],
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      {/* Toast container - positioned at top-right for high visibility */}
      <aside
        aria-live="polite"
        className="pointer-events-none fixed top-5 right-5 z-[9999] flex w-full max-w-sm flex-col gap-2.5 px-4 sm:px-0"
      >
        <AnimatePresence>
          {toasts.map((item) => {
            const Icon = icons[item.type];
            const tone = toneStyles[item.type];

            return (
              <motion.div
                key={item.id}
                role="status"
                initial={{ opacity: 0, y: -12, x: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.92, transition: { duration: 0.16 } }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                className={`pointer-events-auto flex items-start gap-3 border p-4 shadow-xl backdrop-blur-md ${tone.bg} ${tone.border}`}
              >
                <Icon className={`size-5 shrink-0 mt-0.5 ${tone.icon}`} />
                <div className="min-w-0 flex-1">
                  {item.title && (
                    <p className={`text-xs font-semibold ${tone.text}`}>{item.title}</p>
                  )}
                  <p className={`text-xs leading-relaxed ${tone.text} ${item.title ? "mt-0.5" : ""}`}>
                    {item.message}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  className="shrink-0 p-1 text-stone-400 transition hover:text-stone-700"
                  aria-label="Close notification"
                >
                  <X className="size-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </aside>
    </ToastContext.Provider>
  );
}
