import Link from "next/link";
import { Logo } from "@/components/brand";

export function AuthShell({
  children,
  title,
  subtitle,
  footer,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-surface">
      {/* Brand panel — desktop */}
      <div className="relative hidden w-[46%] overflow-hidden bg-navy-950 lg:flex lg:flex-col">
        <div className="p-10">
          <Logo light size="md" />
        </div>
        <div className="flex flex-1 flex-col justify-center px-14">
          <p className="font-heading text-4xl font-bold leading-tight text-white">
            One link.
            <br />
            All your <span className="text-gold">prices.</span>
          </p>
          <p className="mt-5 max-w-sm text-title leading-relaxed text-navy-200">
            List what you sell, share one link, and take orders on WhatsApp.
            Free to start.
          </p>
          <div className="mt-10 space-y-5">
            {[
              "A storefront that carries your business name",
              "Orders land straight in your WhatsApp",
              "A link and QR code you can share anywhere",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-body text-navy-200">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>
        <p className="p-10 text-caption text-navy-400">
          Made for Nigerian businesses.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo size="md" />
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-7 shadow-soft sm:p-9">
            <h1 className="font-heading text-headline font-semibold text-ink">
              {title}
            </h1>
            <p className="mt-1.5 text-body text-ink-secondary">{subtitle}</p>
            <div className="mt-7">{children}</div>
          </div>
          {footer && <div className="mt-6 text-center text-body text-ink-secondary">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
