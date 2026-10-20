"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
  compact,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white text-center",
        compact ? "px-5 py-8" : "px-5 py-14",
        className,
      )}
    >
      {icon && <div className="mb-3 text-neutral-400">{icon}</div>}
      <h3 className="font-heading text-title font-semibold text-ink">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-body text-ink-muted">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm" className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
