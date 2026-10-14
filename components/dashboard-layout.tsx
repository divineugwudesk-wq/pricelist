"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FolderOpen,
  ShoppingBag,
  Palette,
  BarChart3,
  CreditCard,
  Settings,
  ExternalLink,
  Share2,
  Menu,
  X,
  Store,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand";

interface NavItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { label: string; href: string; icon: React.ComponentType<{ className?: string }> }[];
}

const NAV: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Store",
    icon: Store,
    children: [
      { label: "Products", href: "/dashboard/products", icon: Package },
      { label: "Categories", href: "/dashboard/categories", icon: FolderOpen },
      { label: "Orders", href: "/dashboard/orders", icon: ShoppingBag },
      { label: "Customize Store", href: "/dashboard/store", icon: Palette },
    ],
  },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  {
    label: "Account",
    icon: Settings,
    children: [
      { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
      { label: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

export function DashboardLayout({
  children,
  userName,
  businessName,
  storeSlug,
}: {
  children: React.ReactNode;
  userName: string | null;
  businessName?: string | null;
  storeSlug?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(
    NAV.find((n) => n.children?.some((c) => c.href === pathname))?.label ?? null,
  );

  const go = (href: string) => {
    router.push(href);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Sidebar — desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-navy-100 bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-navy-50 px-6">
          <Logo size="md" />
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {NAV.map((item) => {
            if (item.children) {
              const isOpen = expanded === item.label;
              const active = item.children.some((c) => pathname === c.href);
              return (
                <div key={item.label}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : item.label)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active ? "text-navy-900" : "text-ink-secondary hover:bg-navy-50",
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </span>
                    <ChevronDown
                      className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")}
                    />
                  </button>
                  {isOpen && (
                    <div className="mt-0.5 space-y-0.5 border-l border-navy-100 ml-5 pl-2">
                      {item.children.map((child) => (
                        <button
                          key={child.href}
                          onClick={() => go(child.href)}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] transition-colors",
                            pathname === child.href
                              ? "bg-navy-50 font-medium text-navy-900"
                              : "text-ink-secondary hover:bg-navy-50/60",
                          )}
                        >
                          <child.icon className="h-3.5 w-3.5" />
                          {child.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <button
                key={item.label}
                onClick={() => go(item.href!)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-navy-50 text-navy-900"
                    : "text-ink-secondary hover:bg-navy-50",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-navy-50 p-4">
          {storeSlug && (
            <div className="mb-2 flex gap-2">
              <a
                href={`/${storeSlug}`}
                target="_blank"
                rel="noreferrer"
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-navy-200 text-[13px] font-medium text-navy-800 transition-colors hover:bg-navy-50"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View Store
              </a>
              <button
                onClick={() => {
                  void navigator.clipboard?.writeText(`${location.origin}/${storeSlug}`);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-navy-200 text-navy-800 transition-colors hover:bg-navy-50"
                aria-label="Copy store link"
              >
                <Share2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div className="rounded-xl bg-navy-900 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-navy-300">
              Signed in as
            </p>
            <p className="mt-0.5 truncate text-sm font-medium text-white">
              {userName?.split(" ")[0] ?? "Business owner"}
            </p>
            {businessName && (
              <p className="truncate text-xs text-navy-300">{businessName}</p>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-navy-100 bg-white px-4 lg:hidden">
        <Logo size="sm" />
        <div className="flex items-center gap-1">
          {storeSlug && (
            <a
              href={`/${storeSlug}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg p-2 text-ink-secondary"
              aria-label="View store"
            >
              <ExternalLink className="h-5 w-5" />
            </a>
          )}
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-ink-secondary"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-navy-950/50 animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-[280px] flex-col bg-white shadow-lift animate-slide-up">
            <div className="flex h-14 items-center justify-between border-b border-navy-50 px-4">
              <Logo size="sm" />
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-2 text-ink-secondary"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
              {NAV.map((item) =>
                item.children ? (
                  <div key={item.label}>
                    <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                      {item.label}
                    </p>
                    {item.children.map((child) => (
                      <button
                        key={child.href}
                        onClick={() => go(child.href)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm",
                          pathname === child.href
                            ? "bg-navy-50 font-medium text-navy-900"
                            : "text-ink-secondary",
                        )}
                      >
                        <child.icon className="h-4 w-4" />
                        {child.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    key={item.label}
                    onClick={() => go(item.href!)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium",
                      pathname === item.href
                        ? "bg-navy-50 text-navy-900"
                        : "text-ink-secondary",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                ),
              )}
            </nav>
            {storeSlug && (
              <div className="border-t border-navy-50 p-4">
                <a
                  href={`/${storeSlug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-10 items-center justify-center gap-2 rounded-xl bg-navy-900 text-sm font-medium text-white"
                >
                  <ExternalLink className="h-4 w-4" />
                  View My Store
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      <main className="lg:pl-[248px]">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-navy-100 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        <MobileTab href="/dashboard" icon={LayoutDashboard} label="Home" pathname={pathname} />
        <MobileTab href="/dashboard/products" icon={Package} label="Products" pathname={pathname} />
        <MobileTab href="/dashboard/orders" icon={ShoppingBag} label="Orders" pathname={pathname} />
        <MobileTab href="/dashboard/store" icon={Palette} label="Store" pathname={pathname} />
        <MobileTab href="/dashboard/settings" icon={Settings} label="Account" pathname={pathname} />
      </nav>
      <div className="h-16 lg:hidden" />
    </div>
  );
}

function MobileTab({
  href,
  icon: Icon,
  label,
  pathname,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  pathname: string;
}) {
  const router = useRouter();
  const active =
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
  return (
    <button
      onClick={() => router.push(href)}
      className={cn(
        "flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
        active ? "text-navy-900" : "text-ink-muted",
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
}
