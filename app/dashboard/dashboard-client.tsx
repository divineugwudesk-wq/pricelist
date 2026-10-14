"use client";

import { useState } from "react";
import { formatNaira, formatNairaCompact } from "@/lib/money";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatCard } from "@/components/ui/stat";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, timeAgo } from "@/lib/utils";
import Link from "next/link";
import {
  Eye,
  Package,
  MessageCircle,
  TrendingUp,
  Plus,
  Palette,
  Share2,
  ExternalLink,
  ArrowRight,
  ShoppingBag,
  FolderOpen,
} from "lucide-react";
import { generateQrDataUrl } from "@/lib/qr";
import type { Plan } from "@/lib/db-types";
import { PLANS, type PlanDefinition } from "@/lib/plans";

interface Business {
  id: string;
  name: string;
  slug: string;
  categories: Array<{ id: string; name: string }>;
  orders: Array<{ id: string; customerName: string | null; items: Array<unknown>; total: number; status: string; createdAt: Date }>;
  products: Array<{ id: string; name: string; slug: string; price: number; salePrice: number | null; imageUrl: string | null; isAvailable: boolean; isFeatured: boolean }>;
}

interface User {
  id: string;
  name: string | null;
  email: string | null;
  role: "USER" | "ADMIN";
}

interface DashboardClientProps {
  business: Business & {
    orders: Array<{ id: string; customerName: string | null; items: Array<unknown>; total: number; status: string; createdAt: Date }>;
    products: Array<{ id: string; name: string; slug: string; price: number; salePrice: number | null; imageUrl: string | null; isAvailable: boolean; isFeatured: boolean }>;
  };
  user: User;
  plan: Plan;
  planDef: PlanDefinition;
  productCount: number;
}

export function DashboardClient({
  business,
  user,
  plan,
  planDef,
  productCount,
}: DashboardClientProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const usage =
    planDef.maxProducts === null
      ? `${productCount} / ∞`
      : `${productCount} / ${planDef.maxProducts}`;

  const handleGenerateQr = async () => {
    const url = `${process.env.APP_URL ?? "http://localhost:3000"}/${business.slug}`;
    const dataUrl = await generateQrDataUrl(url);
    setQrDataUrl(dataUrl);
  };

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Products"
          value={String(productCount)}
          icon={Package}
        />
        <StatCard
          label="Orders (all time)"
          value={String(business.orders.length)}
          icon={ShoppingBag}
        />
        <StatCard
          label="Revenue (all time)"
          value={formatNairaCompact(business.orders.reduce((sum, o) => sum + o.total, 0))}
          icon={TrendingUp}
        />
        <StatCard
          label="Categories"
          value={String(business.categories?.length ?? 0)}
          icon={FolderOpen}
        />
      </div>

      {/* Recent orders + Quick actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Recent orders"
              subtitle="Orders placed through WhatsApp"
              action={
                <Link href="/dashboard/orders">
                  <Button variant="ghost" size="sm">
                    View all
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              }
            />
            <CardBody className="px-2 py-3">
              {business.orders.length === 0 ? (
                <EmptyState
                  compact
                  icon={<ShoppingBagIcon />}
                  title="No orders yet"
                  description="When customers order through WhatsApp, they'll appear here."
                />
              ) : (
                <div className="divide-y divide-navy-50">
                  {business.orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center gap-4 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">
                          {order.customerName || "WhatsApp customer"}
                        </p>
                        <p className="text-xs text-ink-muted">
                          {order.items.length} item{order.items.length === 1 ? "" : "s"} ·{" "}
                          {timeAgo(order.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-ink">
                          {formatNaira(order.total)}
                        </p>
                        <Badge
                          tone={
                            order.status === "COMPLETED"
                              ? "success"
                              : order.status === "CANCELLED"
                              ? "danger"
                              : order.status === "CONFIRMED"
                              ? "gold"
                              : "navy"
                          }
                        >
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Share store */}
          <Card>
            <CardHeader title="Share your store" subtitle="Get the word out" />
            <CardBody>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-ink">{business.name}</p>
                    <p className="text-sm text-ink-muted truncate">
                      {process.env.APP_URL ?? "http://localhost:3000"}/{business.slug}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        `Check out my products and prices on PRICELIST 👇\n${process.env.APP_URL ?? "http://localhost:3000"}/${business.slug}`,
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button variant="outline" size="sm">
                        <Share2 className="h-3.5 w-3.5" />
                        WhatsApp
                      </Button>
                    </a>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void navigator.clipboard?.writeText(
                          `${process.env.APP_URL ?? "http://localhost:3000"}/${business.slug}`,
                        );
                      }}
                    >
                      Copy link
                    </Button>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleGenerateQr}
                >
                  Generate QR code
                </Button>
                {qrDataUrl && (
                  <div className="mt-3 text-center">
                    <img src={qrDataUrl} alt="QR code" className="mx-auto rounded-xl border border-navy-100 p-2" />
                    <p className="mt-2 text-xs text-ink-muted">Scan to open store</p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Plan usage */}
          <Card>
            <CardHeader
              title={`${planDef.name} plan`}
              subtitle={plan === "FREE" ? "Upgrade anytime" : "Active"}
            />
            <CardBody>
              <div className="mb-2 flex items-center justify-between text-[13px]">
                <span className="text-ink-secondary">Product usage</span>
                <span className="font-medium text-ink">{usage}</span>
              </div>
              {planDef.maxProducts && (
                <div className="h-1.5 overflow-hidden rounded-full bg-navy-100">
                  <div
                    className={`h-full rounded-full transition-all ${
                      productCount >= planDef.maxProducts ? "bg-gold" : "bg-navy-800"
                    }`}
                    style={{
                      width: `${Math.min(100, (productCount / planDef.maxProducts) * 100)}%`,
                    }}
                  />
                </div>
              )}
              {plan === "FREE" && (
                <div className="mt-4 rounded-xl bg-navy-50 p-4">
                  <p className="text-[13px] font-medium text-ink">
                    {productCount >= (planDef.maxProducts ?? 5)
                      ? "You've reached your Free plan limit."
                      : "Need more products?"}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    Starter gives you up to 50 products, search, analytics and more.
                  </p>
                  <Link href="/dashboard/billing">
                    <Button variant="gold" size="sm" className="mt-3 w-full">
                      Upgrade for ₦1,500/mo
                    </Button>
                  </Link>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-6">
        <p className="mb-3 text-[13px] font-medium text-ink-secondary">Quick actions</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link href="/dashboard/products/new">
            <QuickAction icon={<Plus className="h-5 w-5" />} label="Add product" />
          </Link>
          <Link href="/dashboard/store">
            <QuickAction icon={<Palette className="h-5 w-5" />} label="Customize store" />
          </Link>
          <Link href={`/${business.slug}`} target="_blank" rel="noreferrer">
            <QuickAction icon={<ExternalLink className="h-5 w-5" />} label="View store" />
          </Link>
          <Link href="/dashboard/products">
            <QuickAction icon={<Package className="h-5 w-5" />} label="Manage products" />
          </Link>
        </div>
      </div>

      {/* Top products preview */}
      {business.products.length > 0 && (
        <Card className="mt-6">
          <CardHeader
            title="Latest products"
            action={
              <Link href="/dashboard/products">
                <Button variant="ghost" size="sm">
                  Manage
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            }
          />
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {business.products.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-xl border border-navy-50 p-3">
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="h-14 w-14 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="h-14 w-14 shrink-0 rounded-xl bg-navy-50 flex items-center justify-center">
                      <Package className="h-6 w-6 text-navy-300" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{p.name}</p>
                    <p className="text-xs text-ink-muted">
                      {formatNaira(p.salePrice ?? p.price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.isFeatured && <Star className="h-3.5 w-3.5 text-gold" />}
                    <Badge
                      tone={p.isAvailable ? "success" : "muted"}
                      className="text-[10px]"
                    >
                      {p.isAvailable ? "Active" : "Hidden"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function QuickAction({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-navy-100 bg-white p-4 text-center transition-colors hover:border-navy-200">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-50 text-navy-700">
        {icon}
      </div>
      <span className="text-[13px] font-medium text-ink">{label}</span>
    </div>
  );
}

function ShoppingBagIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a2 2 0 00-2-2H6a2 2 0 00-2 2v4m14 0h-2m2 0v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4" />
    </svg>
  );
}

function Star({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}