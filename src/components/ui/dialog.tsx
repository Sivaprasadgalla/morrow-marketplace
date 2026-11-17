"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, HelpCircle, LoaderCircle, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  busy = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const isLoading = busy || submitting;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isLoading) onClose();
    }
    if (open) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, isLoading, onClose]);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await onConfirm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Confirmation failed.", "Action Error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <motion.button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => !busy && onClose()}
            aria-label="Close dialog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Dialog Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-md overflow-hidden border border-stone-200 bg-[#fbf7ef] p-6 shadow-2xl sm:p-7"
          >
            <div className="flex items-start gap-3.5">
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-full ${
                  variant === "danger"
                    ? "bg-red-100 text-red-700"
                    : "bg-[#e7ddcd] text-[#5a4e3e]"
                }`}
              >
                {variant === "danger" ? (
                  <AlertTriangle className="size-4.5" />
                ) : (
                  <HelpCircle className="size-4.5" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <h3 className="font-serif text-xl font-medium tracking-tight text-stone-900">
                  {title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-stone-600">{description}</p>
              </div>

              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="shrink-0 rounded-full p-1 text-stone-400 transition hover:bg-stone-200 hover:text-stone-700"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isLoading}
                className="text-xs"
              >
                {cancelLabel}
              </Button>
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={isLoading}
                className={`text-xs ${
                  variant === "danger"
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-[#211f1a] text-white hover:bg-[#36322b]"
                }`}
              >
                {isLoading ? <LoaderCircle className="size-3.5 animate-spin mr-1.5" /> : null}
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

export interface PromptDialogProps {
  open: boolean;
  title: string;
  description?: string;
  inputLabel?: string;
  inputPlaceholder?: string;
  defaultValue?: string;
  required?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: (value: string) => void | Promise<void>;
  onClose: () => void;
}

export function PromptDialog({ open, ...props }: PromptDialogProps) {
  return (
    <AnimatePresence>
      {open ? (
        <PromptModalContent key={props.defaultValue ?? "prompt"} {...props} />
      ) : null}
    </AnimatePresence>
  );
}

function PromptModalContent({
  title,
  description,
  inputLabel,
  inputPlaceholder = "Enter value...",
  defaultValue = "",
  required = false,
  confirmLabel = "Submit",
  cancelLabel = "Cancel",
  busy = false,
  onConfirm,
  onClose,
}: Omit<PromptDialogProps, "open">) {
  const { toast } = useToast();
  const [val, setVal] = useState(defaultValue);
  const [submitting, setSubmitting] = useState(false);
  const isLoading = busy || submitting;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isLoading) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLoading, onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (required && !val.trim()) {
      toast.warning(
        inputLabel
          ? `Please provide ${inputLabel.toLowerCase()}.`
          : "Please enter a value before submitting.",
        "Required Field",
      );
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm(val);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed.", "Action Error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <motion.button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-xs"
        onClick={() => !busy && onClose()}
        aria-label="Close dialog"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Dialog Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-lg overflow-hidden border border-stone-200 bg-[#fbf7ef] p-6 shadow-2xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-serif text-2xl font-medium tracking-tight text-stone-900">
              {title}
            </h3>
            {description && (
              <p className="mt-1.5 text-xs leading-relaxed text-stone-600">{description}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="shrink-0 rounded-full p-1 text-stone-400 transition hover:bg-stone-200 hover:text-stone-700"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block">
            {inputLabel && (
              <span className="mb-2 block text-xs font-medium text-stone-700">
                {inputLabel}
                {required && <span className="text-red-600 ml-0.5">*</span>}
              </span>
            )}
            <textarea
              value={val}
              onChange={(e) => setVal(e.target.value)}
              placeholder={inputPlaceholder}
              rows={3}
              required={required}
              autoFocus
              className="w-full border border-stone-300 bg-white p-3 text-xs text-stone-900 outline-none transition focus:border-stone-600 focus:ring-1 focus:ring-stone-600"
            />
          </label>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isLoading}
              className="text-xs"
            >
              {cancelLabel}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || (required && !val.trim())}
              className="bg-[#211f1a] text-xs text-white hover:bg-[#36322b]"
            >
              {isLoading ? <LoaderCircle className="size-3.5 animate-spin mr-1.5" /> : null}
              {confirmLabel}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
