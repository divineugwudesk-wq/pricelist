import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  navy: "bg-navy-100 text-navy-800",
  gold: "bg-gold-faint text-gold-deep",
  success: "bg-[#E5F4EE] text-success",
  danger: "bg-[#F9E9E9] text-danger",
  warning: "bg-[#FAF1DF] text-warning",
  muted: "bg-navy-50 text-ink-muted",
};

export function Badge({
  children,
  tone = "navy",
  className,
  dot,
}: {
  children: React.ReactNode;
  tone?: keyof typeof tones;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        tones[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
