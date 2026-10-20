"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Dialog({
  open,
  onClose,
  title,
  children,
  className,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[90] flex items-end justify-center bg-navy-950/40 p-0 sm:items-center sm:p-6 animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={cn(
          "flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-xl bg-white shadow-lift animate-slide-up sm:rounded-xl",
          wide ? "sm:max-w-3xl" : "sm:max-w-md",
          className,
        )}
      >
        {title && (
          <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-5 py-3.5">
            <h2 className="font-heading text-title font-semibold text-ink">{title}</h2>
            <button
              onClick={onClose}
              className="-mr-1 rounded-md p-1.5 text-ink-muted transition-colors hover:bg-neutral-100 hover:text-ink"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
