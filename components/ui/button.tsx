"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "whatsapp" | "onDark";
type Size = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  // One filled primary style. Everything else steps down from it.
  primary: "bg-navy-900 text-white hover:bg-navy-800 active:bg-navy-950",
  secondary: "bg-neutral-100 text-ink hover:bg-neutral-200",
  outline: "border border-neutral-300 bg-white text-ink hover:border-neutral-400 hover:bg-neutral-50",
  ghost: "text-ink-secondary hover:bg-neutral-100 hover:text-ink",
  danger: "bg-danger text-white hover:bg-[#9C3232]",
  whatsapp: "bg-whatsapp text-white hover:bg-[#064A42]",
  onDark: "bg-white text-navy-900 hover:bg-neutral-100",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-caption rounded-md gap-1.5",
  md: "h-11 px-4 text-body rounded-md gap-2",
  lg: "h-12 px-5 text-title rounded-md gap-2",
  icon: "h-10 w-10 rounded-md",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap font-medium",
        "transition-colors duration-150",
        "disabled:pointer-events-none disabled:opacity-45",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="h-4 w-4 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-90"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
