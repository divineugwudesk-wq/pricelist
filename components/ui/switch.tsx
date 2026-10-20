"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Switch = forwardRef<
  HTMLButtonElement,
  {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    disabled?: boolean;
    small?: boolean;
  }
>(({ checked, onChange, label, disabled, small }, ref) => (
  <button
    ref={ref}
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label ?? "toggle"}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={cn(
      "relative inline-flex shrink-0 items-center rounded-full transition-colors duration-150",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500/40",
      "disabled:opacity-50",
      checked ? "bg-navy-800" : "bg-neutral-300",
      small ? "h-5 w-9" : "h-6 w-11",
    )}
  >
    <span
      className={cn(
        "inline-block transform rounded-full bg-white shadow-sm transition-transform duration-150",
        small ? "h-4 w-4" : "h-5 w-5",
        checked ? (small ? "translate-x-4" : "translate-x-6") : "translate-x-0.5",
      )}
    />
  </button>
));
Switch.displayName = "Switch";
