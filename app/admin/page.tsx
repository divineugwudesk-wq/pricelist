"use client";

import { useCallback, useEffect, useState } from "react";
import { redirect } from "next/navigation";
import {
  Users,
  Store,
  CreditCard,
  TrendingUp,
  Eye,
  MessageCircle,
  UserPlus,
  ShoppingBag,
  Search,
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  Ban,
  CheckCircle2,
} from "lucide-react";
import { Logo } from "@/components/brand";
import { StatCard } from "@/components/ui/stat";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { formatNaira, formatNairaCompact } from "@/lib/money";
import { formatDateTime, timeAgo } from "@/lib/utils";
import { categoryLabel } from "@/lib/storefront-utils";

interface AdminStats {
  totalUsers: number;
  activeBusinesses: number;
  freeUsers: number;
  starterSubscribers: number;
  proSubscribers: number;
  mrrKobo: number;
  newRegistrations7d: number;
  storeViews: number;
  whatsappOrderClicks: number;
  totalOrders: number;
  totalOrderValueKobo: number;
}

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  role: "USER" | "ADMIN";
  suspended: boolean;
  createdAt: string;
  business: { name: string; slug: string; suspended: boolean } | null;
  subscription: { plan: string; status: string } | null;
}

interface AdminBusiness {
  id: string;
  name: string;
  slug: string;
  category: string;
  theme: string;
  suspended: boolean;
  createdAt: string;
  user: { name: string | null; email: string };
  _count: { products: number; orders: number };
}

interface AdminSubscription {
  plan: string;
  status: string;
  provider: string;
  startDate: string | null;
  renewalDate: string | null;
  createdAt: string;
  user: { name: string | null; email: string };
}

interface AdminOrder {
  id: string;
  customerName: string | null;
  total: number;
  status: string;
  createdAt: string;
  business: { name: string; slug: string };
}

const TABS = [
  ["users", "Users"],
  ["businesses", "Businesses"],
  ["subscriptions", "Subscriptions"],
  ["orders", "Orders"],
] as const;

export default function AdminPage() {
  const toast = useToast();
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("users");
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [businesses, setBusinesses] = useState<AdminBusiness[] | null>(null);
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[] | null>(null);
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  // Verify admin server-side on mount.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        if (!data?.user) {
          redirect("/login?callbackUrl=/admin");
          return;
        }
        setUser(data.user);
        if (data.user.role !== "ADMIN") {
          redirect("/dashboard");
          return;
        }
      } catch {
        redirect("/login?callbackUrl=/admin");
      }
    })();
  }, []);

  const loadStats = useCallback(async () => {
    const res = await fetch("/api/admin");
    if (res.status === 401 || res.status === 403) {
      redirect("/dashboard");
      return;
    }
    const data = await res.json();
    setStats(data.stats);
  }, []);

  const loadTab = useCallback(async () => {
    if (tab === "users") {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q, role: roleFilter }),
      });
      const data = await res.json();
      setUsers(data.users ?? []);
    } else {
      const res = await fetch(`/api/admin?q=${encodeURIComponent(q)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      setBusinesses(data.businesses ?? []);
      setSubscriptions(data.subscriptions ?? []);
      setOrders(data.recentOrders ?? []);
    }
  }, [tab, q, roleFilter]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    void loadTab();
  }, [loadTab]);

  async function toggleBusiness(businessId: string, suspended: boolean) {
    setActing(businessId);
    const res = await fetch("/api/admin", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, suspended }),
    });
    setActing(null);
    if (!res.ok) {
      toast.error("Could not update business", "Please try again.");
      return;
    }
    toast.success(suspended ? "Business suspended" : "Business restored");
    await loadTab();
  }

  async function toggleUser(userId: string, suspended: boolean) {
    setActing(userId);
    const res = await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, suspended }),
    });
    setActing(null);
    if (!res.ok) {
      toast.error("Could not update user", "Please try again.");
      return;
    }
    toast.success(suspended ? "User suspended" : "User restored");
    await loadTab();
  }

  const loading = stats === null;

  if (loading) {
    return (
      <div className="min-h-screen bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="h-9 w-48 animate-pulse rounded-lg bg-neutral-100" />
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo size="md" />
            <Badge tone="gold" className="ml-1">Admin</Badge>
          </div>
          <div className="flex items-center gap-2">
            <a href="/" className="text-caption font-medium text-ink-secondary hover:text-navy-900">
              View site
            </a>
            <a href="/dashboard" className="text-caption font-medium text-ink-secondary hover:text-navy-900">
              Dashboard
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-headline font-semibold text-ink">
              Platform overview
            </h1>
            <p className="mt-1 text-caption text-ink-muted">
              Users, businesses, subscriptions and revenue across PRICELIST.
            </p>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total users" value={stats!.totalUsers.toLocaleString()} icon={Users} sub={`+${stats!.newRegistrations7d} this week`} />
          <StatCard label="Active businesses" value={stats!.activeBusinesses.toLocaleString()} icon={Store} />
          <StatCard label="Store views" value={stats!.storeViews.toLocaleString()} icon={Eye} />
          <StatCard label="WhatsApp order clicks" value={stats!.whatsappOrderClicks.toLocaleString()} icon={MessageCircle} />
          <StatCard label="Free users" value={stats!.freeUsers.toLocaleString()} icon={UserPlus} />
          <StatCard label="Starter subscribers" value={stats!.starterSubscribers.toLocaleString()} icon={CreditCard} />
          <StatCard label="Pro subscribers" value={stats!.proSubscribers.toLocaleString()} icon={TrendingUp} />
          <StatCard
            label="Monthly recurring revenue"
            value={formatNaira(stats!.mrrKobo)}
            icon={CreditCard}
            sub={`${stats!.totalOrders} orders · ${formatNairaCompact(stats!.totalOrderValueKobo)} total value`}
          />
        </div>

        {/* Tabs */}
        <div className="mb-5 mt-8 flex flex-wrap items-center gap-2">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`rounded-full px-4 py-2 text-caption font-medium transition-colors ${
                tab === id
                  ? "bg-navy-900 text-white"
                  : "border border-neutral-300 bg-white text-ink-secondary hover:border-navy-400"
              }`}
            >
              {label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <Input
                className="w-48 pl-9 sm:w-56"
                placeholder="Search…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Search"
              />
            </div>
            {tab === "users" && (
              <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-32" aria-label="Role filter">
                <option value="ALL">All roles</option>
                <option value="USER">Business owners</option>
                <option value="ADMIN">Admins</option>
              </Select>
            )}
          </div>
        </div>

        {/* Users tab */}
        {tab === "users" && (
          <Card>
            <CardHeader title="Users" subtitle={`${users?.length ?? 0} accounts`} />
            <CardBody className="px-2 py-3">
              {users === null ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : users.length === 0 ? (
                <EmptyState compact title="No users found" description="Try a different search." />
              ) : (
                <div className="divide-y divide-neutral-100">
                  {users.map((u) => (
                    <div key={u.id} className="flex items-center gap-4 px-4 py-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-50 font-heading text-body font-bold text-navy-700">
                        {(u.name ?? u.email).slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body font-medium text-ink">
                          {u.name ?? u.email}
                          {u.role === "ADMIN" && (
                            <Badge tone="gold" className="ml-2">Admin</Badge>
                          )}
                          {u.suspended && <Badge tone="danger" className="ml-2">Suspended</Badge>}
                        </p>
                        <p className="truncate text-caption text-ink-muted">
                          {u.email} · joined {timeAgo(u.createdAt)}
                          {u.business ? ` · ${u.business.name}` : " · no store yet"}
                          {u.subscription ? ` · ${u.subscription.plan}` : ""}
                        </p>
                      </div>
                      {u.business && (
                        <a
                          href={`/${u.business.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hidden sm:block"
                          aria-label="View store"
                        >
                          <ExternalLink className="h-4 w-4 text-ink-muted" />
                        </a>
                      )}
                      <Button
                        variant={u.suspended ? "outline" : "danger"}
                        size="sm"
                        loading={acting === u.id}
                        onClick={() => void toggleUser(u.id, !u.suspended)}
                      >
                        {u.suspended ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                        {u.suspended ? "Restore" : "Suspend"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* Businesses tab */}
        {tab === "businesses" && (
          <Card>
            <CardHeader title="Businesses" subtitle={`${businesses?.length ?? 0} storefronts`} />
            <CardBody className="px-2 py-3">
              {businesses === null ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-14" />
                  ))}
                </div>
              ) : businesses.length === 0 ? (
                <EmptyState compact title="No businesses found" description="Try a different search." />
              ) : (
                <div className="divide-y divide-neutral-100">
                  {businesses.map((b) => (
                    <div key={b.id} className="flex items-center gap-4 px-4 py-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-50 font-heading text-body font-bold text-navy-700">
                        {b.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body font-medium text-ink">
                          {b.name}
                          {b.suspended && <Badge tone="danger" className="ml-2">Suspended</Badge>}
                        </p>
                        <p className="truncate text-caption text-ink-muted">
                          /{b.slug} · {categoryLabel(b.category)} · {b.theme} theme ·{" "}
                          {b._count.products} products · {b._count.orders} orders
                        </p>
                        <p className="truncate text-micro text-ink-muted">
                          {b.user.email}
                        </p>
                      </div>
                      <a
                        href={`/${b.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="View storefront"
                      >
                        <ExternalLink className="h-4 w-4 text-ink-muted" />
                      </a>
                      <Button
                        variant={b.suspended ? "outline" : "danger"}
                        size="sm"
                        loading={acting === b.id}
                        onClick={() => void toggleBusiness(b.id, !b.suspended)}
                      >
                        {b.suspended ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                        {b.suspended ? "Restore" : "Suspend"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* Subscriptions tab */}
        {tab === "subscriptions" && (
          <Card>
            <CardHeader title="Subscriptions" subtitle="Paid plans across the platform" />
            <CardBody className="px-2 py-3">
              {subscriptions === null ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : subscriptions.length === 0 ? (
                <EmptyState compact title="No paid subscriptions yet" description="Starter and Pro subscriptions appear here." />
              ) : (
                <div className="divide-y divide-neutral-100">
                  {subscriptions.map((s, i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-3">
                      <Badge tone={s.plan === "PRO" ? "gold" : "brand"}>
                        {s.plan}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body font-medium text-ink">
                          {s.user.name ?? s.user.email}
                        </p>
                        <p className="truncate text-caption text-ink-muted">
                          {s.user.email} · via {s.provider}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge tone={s.status === "ACTIVE" ? "success" : "warning"} dot>
                          {s.status}
                        </Badge>
                        {s.renewalDate && (
                          <p className="mt-0.5 text-micro text-ink-muted">
                            renews {formatDateTime(s.renewalDate)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* Orders tab */}
        {tab === "orders" && (
          <Card>
            <CardHeader title="Recent orders" subtitle="Latest WhatsApp orders across all stores" />
            <CardBody className="px-2 py-3">
              {orders === null ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <EmptyState compact icon={<ShoppingBag className="h-5 w-5" />} title="No orders yet" description="Orders placed through WhatsApp appear here." />
              ) : (
                <div className="divide-y divide-neutral-100">
                  {orders.map((o) => (
                    <div key={o.id} className="flex items-center gap-4 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body font-medium text-ink">
                          {o.customerName ?? "WhatsApp customer"}
                        </p>
                        <p className="truncate text-caption text-ink-muted">
                          {o.business.name} · {timeAgo(o.createdAt)}
                        </p>
                      </div>
                      <span className="text-body font-semibold text-ink">
                        {formatNaira(o.total)}
                      </span>
                      <Badge
                        tone={
                          o.status === "COMPLETED"
                            ? "success"
                            : o.status === "CANCELLED"
                              ? "danger"
                              : o.status === "CONFIRMED"
                                ? "brand"
                                : "neutral"
                        }
                      >
                        {o.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* Security note */}
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-5">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
          <div>
            <p className="text-body font-medium text-ink">Admin access is server-side</p>
            <p className="mt-0.5 text-caption leading-relaxed text-ink-muted">
              Every admin API verifies your role on the server. Users can only
              modify their own businesses, products and orders — client-supplied
              IDs are always re-checked against the session.
            </p>
          </div>
        </div>
        <p className="mt-4 flex items-center gap-1.5 text-caption text-ink-muted">
          <ShieldAlert className="h-3.5 w-3.5" />
          Suspending a business immediately hides its storefront from customers.
        </p>
      </main>
    </div>
  );
}
