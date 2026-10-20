"use client";

import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
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
  Link2,
  Menu,
  X,
  Store,
  ChevronDown,
  LogOut,
  Plus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";

interface NavChild {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavChild[];
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
      { label: "Customize store", href: "/dashboard/store", icon: Palette },
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

/** Routes that are only reachable from the mobile overflow sheet. */
const OVERFLOW: NavChild[] = [
  { label: "Categories", href: "/dashboard/categories", icon: FolderOpen },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
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
  const [moreOpen, setMoreOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(
    NAV.find((n) => n.children?.some((c) => c.href === pathname))?.label ?? null,
  );
  const [remote, setRemote] = useState<{ name: string | null; slug: string | null }>({
    name: null,
    slug: null,
  });

  // The sidebar needs the store on every page, not only the overview.
  useEffect(() => {
    if (storeSlug) return;
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/businesses");
        if (!res.ok) return;
        const data = await res.json();
        if (!active || !data.business) return;
        setRemote({ name: data.business.name, slug: data.business.slug });
      } catch {
        /* the sidebar simply shows less */
      }
    })();
    return () => {
      active = false;
    };
  }, [storeSlug]);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const name = businessName ?? remote.name;
  const slug = storeSlug ?? remote.slug;
  const storeHref = slug ? `/${slug}` : null;

  const go = (href: string) => {
    router.push(href);
    setMoreOpen(false);
  };

  const copyLink = async () => {
    if (!slug) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/${slug}`);
    } catch {
      /* clipboard may be blocked */
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Sidebar — desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-neutral-200 bg-white lg:flex">
        <div className="flex h-16 items-center border-b border-neutral-100 px-5">
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
                      "flex w-full items-center justify-between rounded-md px-3 py-2 text-body font-medium transition-colors",
                      active ? "text-navy-900" : "text-ink-secondary hover:bg-neutral-100",
                    )}
                    aria-expanded={isOpen}
                  >
                    <span className="flex items-center gap-2.5">
                      <item.icon className="h-4 w-4" aria-hidden="true" />
                      {item.label}
                    </span>
                    <ChevronDown
                      className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")}
                      aria-hidden="true"
                    />
                  </button>
                  {isOpen && (
                    <div className="ml-4 mt-0.5 space-y-0.5 border-l border-neutral-200 pl-2">
                      {item.children.map((child) => (
                        <button
                          key={child.href}
                          onClick={() => go(child.href)}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-caption transition-colors",
                            pathname === child.href
                              ? "bg-neutral-100 font-medium text-navy-900"
                              : "text-ink-secondary hover:bg-neutral-100",
                          )}
                        >
                          <child.icon className="h-3.5 w-3.5" aria-hidden="true" />
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
                  "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-body font-medium transition-colors",
                  pathname === item.href
                    ? "bg-neutral-100 text-navy-900"
                    : "text-ink-secondary hover:bg-neutral-100",
                )}
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-neutral-100 p-3">
          {storeHref && (
            <div className="mb-3">
              <p className="px-1 pb-1.5 text-micro uppercase tracking-wider text-ink-muted">
                Your store
              </p>
              <a
                href={storeHref}
                target="_blank"
                rel="noreferrer"
                className="flex h-9 items-center justify-between gap-2 rounded-md border border-neutral-300 px-3 text-caption font-medium text-ink transition-colors hover:bg-neutral-50"
              >
                <span className="truncate">/{slug}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
              </a>
              <button
                onClick={() => void copyLink()}
                className="mt-1.5 flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-neutral-300 text-caption font-medium text-ink transition-colors hover:bg-neutral-50"
              >
                <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                Copy store link
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 rounded-md px-1 py-1">
            <div className="min-w-0 flex-1">
              <p className="truncate text-caption font-medium text-ink">
                {userName ?? name ?? "Your account"}
              </p>
              {name && name !== userName && (
                <p className="truncate text-caption text-ink-muted">{name}</p>
              )}
            </div>
            <button
              onClick={() => void signOut({ callbackUrl: "/" })}
              className="rounded-md p-2 text-ink-muted transition-colors hover:bg-neutral-100 hover:text-ink"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b border-neutral-200 bg-white px-4 lg:hidden">
        <Logo size="sm" />
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => router.push("/dashboard/products/new")}
            className="h-9"
          >
            <Plus className="h-3.5 w-3.5" />
            Product
          </Button>
          <button
            onClick={() => setMoreOpen(true)}
            className="rounded-md p-2 text-ink-secondary transition-colors hover:bg-neutral-100"
            aria-label="More options"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Mobile overflow sheet */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-navy-950/40 animate-fade-in"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-xl bg-white pb-[env(safe-area-inset-bottom)] shadow-lift animate-slide-up">
            <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
              <p className="font-heading text-title font-semibold text-ink">More</p>
              <button
                onClick={() => setMoreOpen(false)}
                className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-neutral-100"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="p-2">
              {OVERFLOW.map((item) => (
                <button
                  key={item.href}
                  onClick={() => go(item.href)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-body transition-colors hover:bg-neutral-100",
                    pathname === item.href ? "font-medium text-navy-900" : "text-ink-secondary",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="border-t border-neutral-100 p-3">
              {storeHref && (
                <a
                  href={storeHref}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 items-center justify-between gap-2 rounded-md border border-neutral-300 px-3 text-body font-medium text-ink"
                >
                  <span className="truncate">Open your storefront</span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                </a>
              )}
              <button
                onClick={() => void signOut({ callbackUrl: "/" })}
                className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-md text-body font-medium text-ink-secondary transition-colors hover:bg-neutral-100"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="lg:pl-[248px]">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        <MobileTab href="/dashboard" icon={LayoutDashboard} label="Home" pathname={pathname} />
        <MobileTab href="/dashboard/products" icon={Package} label="Products" pathname={pathname} />
        <MobileTab href="/dashboard/orders" icon={ShoppingBag} label="Orders" pathname={pathname} />
        <MobileTab href="/dashboard/store" icon={Palette} label="Store" pathname={pathname} />
        <button
          onClick={() => setMoreOpen(true)}
          className="flex flex-col items-center gap-1 py-2.5 text-micro font-medium text-ink-muted"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
          More
        </button>
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
        "flex flex-col items-center gap-1 py-2.5 text-micro font-medium transition-colors",
        active ? "text-navy-900" : "text-ink-muted",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
      {label}
    </button>
  );
}
