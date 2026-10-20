"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CircleAlert,
  Copy,
  ExternalLink,
  MessageCircle,
  Package,
  QrCode,
  ShoppingBag,
} from "lucide-react";
import { formatNaira, formatNairaCompact } from "@/lib/money";
import { timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Metrics } from "@/components/ui/metrics";
import { EmptyState } from "@/components/ui/empty-state";
import { generateQrDataUrl } from "@/lib/qr";
import type { Plan } from "@/lib/db-types";
import { type PlanDefinition } from "@/lib/plan-data";

interface OrderRow {
  id: string;
  customerName: string | null;
  items: Array<unknown>;
  total: number;
  status: string;
  createdAt: Date;
}

interface ProductRow {
  id: string;
  name: string;
  price: number;
  salePrice: number | null;
  imageUrl: string | null;
  isAvailable: boolean;
  isFeatured: boolean;
}

interface DashboardClientProps {
  business: {
    name: string;
    slug: string;
    description: string | null;
    whatsappNumber: string | null;
    logoUrl: string | null;
    orders: OrderRow[];
    products: ProductRow[];
    categories: Array<{ id: string; name: string }>;
  };
  plan: Plan;
  planDef: PlanDefinition;
  productCount: number;
  orderCount: number;
  revenue: number;
  newOrderCount: number;
  hiddenProductCount: number;
}

const STATUS_TONE: Record<string, "success" | "danger" | "warning" | "brand" | "neutral"> = {
  COMPLETED: "success",
  CANCELLED: "danger",
  CONFIRMED: "brand",
  CONTACTED: "warning",
  NEW: "neutral",
};

export function DashboardClient({
  business,
  plan,
  planDef,
  productCount,
  orderCount,
  revenue,
  newOrderCount,
  hiddenProductCount,
}: DashboardClientProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const storeUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/${business.slug}`;
  const productLimit = planDef.maxProducts;
  const usageLabel = productLimit === null ? `${productCount} products` : `${productCount} / ${productLimit}`;
  const usagePercent =
    productLimit === null || productLimit === 0
      ? 0
      : Math.min(100, Math.round((productCount / productLimit) * 100));

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard can be blocked by the browser */
    }
  };

  const handleGenerateQr = async () => {
    const dataUrl = await generateQrDataUrl(storeUrl);
    setQrDataUrl(dataUrl);
  };

  const whatsappShare = `Hi, have a look at my store — ${storeUrl}`;

  const checklist = [
    {
      done: Boolean(business.whatsappNumber),
      label: "Add your WhatsApp number",
      detail: "Orders arrive as WhatsApp messages.",
      href: "/dashboard/settings",
    },
    {
      done: productCount > 0,
      label: "Add your first product",
      detail: "List a product or a service with its price.",
      href: "/dashboard/products/new",
    },
    {
      done: business.categories.length > 0,
      label: "Add a category",
      detail: "Categories keep your list tidy.",
      href: "/dashboard/categories",
    },
    {
      done: Boolean(business.description),
      label: "Describe your business",
      detail: "A line about what you sell builds trust.",
      href: "/dashboard/settings",
    },
  ];
  const outstanding = checklist.filter((item) => !item.done);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-headline font-semibold text-ink">
            {business.name}
          </h1>
          <p className="mt-1 text-body text-ink-secondary">
            Share your link, take orders on WhatsApp, keep your list up to date.
          </p>
        </div>
        <a href={`/${business.slug}`} target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm">
            <ExternalLink className="h-3.5 w-3.5" />
            Open storefront
          </Button>
        </a>
      </div>

      {/* The one action that matters: get the link out there. */}
      <Card>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-caption font-medium text-ink-secondary">Your store link</p>
              <p className="mt-1 font-serif text-lead text-ink break-all">{storeUrl}</p>
              <p className="mt-2 text-caption text-ink-muted">
                Put it in your WhatsApp status, your Instagram bio, or send it to customers
                directly. Every visit opens your list and the order button.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void copyLink()}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Link copied" : "Copy link"}
            </Button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(whatsappShare)}`}
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="whatsapp" size="sm">
                <MessageCircle className="h-3.5 w-3.5" />
                Share on WhatsApp
              </Button>
            </a>
            <Button variant="outline" size="sm" onClick={() => void handleGenerateQr()}>
              <QrCode className="h-3.5 w-3.5" />
              Get QR code
            </Button>
          </div>
          {qrDataUrl && (
            <div className="flex items-center gap-4 border-t border-neutral-100 pt-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL, no optimizer involved */}
              <img
                src={qrDataUrl}
                alt={`QR code linking to ${business.name}`}
                className="h-28 w-28 rounded-lg border border-neutral-200 bg-white p-1.5"
              />
              <p className="text-caption text-ink-muted">
                Print this on your counter, your flyer, or your business card. It opens your
                store on any phone.
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Totals */}
      <Metrics
        items={[
          {
            label: "Orders",
            value: String(orderCount),
            sub: newOrderCount > 0 ? `${newOrderCount} new` : undefined,
          },
          {
            label: "Revenue",
            value: formatNairaCompact(revenue),
            sub: "cancelled orders excluded",
          },
          {
            label: "Products",
            value: String(productCount),
            sub: hiddenProductCount > 0 ? `${hiddenProductCount} hidden` : undefined,
          },
          { label: "Categories", value: String(business.categories.length) },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title="Recent orders"
              subtitle="Orders customers placed through your link"
              action={
                <Link href="/dashboard/orders">
                  <Button variant="ghost" size="sm">
                    All orders
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              }
            />
            <CardBody className="px-2 py-3">
              {business.orders.length === 0 ? (
                <EmptyState
                  compact
                  icon={<ShoppingBag className="h-5 w-5" />}
                  title="No orders yet"
                  description="Share your store link and the first order will show up here."
                />
              ) : (
                <ul className="divide-y divide-neutral-100">
                  {business.orders.map((order) => (
                    <li key={order.id} className="flex items-center gap-4 px-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body font-medium text-ink">
                          {order.customerName || "WhatsApp customer"}
                        </p>
                        <p className="mt-0.5 text-caption text-ink-muted">
                          {order.items.length} item{order.items.length === 1 ? "" : "s"} ·{" "}
                          {timeAgo(order.createdAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <p className="text-body font-semibold text-ink">
                          {formatNaira(order.total)}
                        </p>
                        <Badge tone={STATUS_TONE[order.status] ?? "neutral"}>
                          {order.status.toLowerCase()}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          {business.products.length > 0 && (
            <Card>
              <CardHeader
                title="Your products"
                action={
                  <Link href="/dashboard/products">
                    <Button variant="ghost" size="sm">
                      Manage
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                }
              />
              <CardBody className="px-2 py-3">
                <ul className="divide-y divide-neutral-100">
                  {business.products.map((product) => (
                    <li key={product.id} className="flex items-center gap-3 px-3 py-3">
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- user-supplied remote URL
                        <img
                          src={product.imageUrl}
                          alt=""
                          className="h-11 w-11 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-ink-muted">
                          <Package className="h-4 w-4" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body font-medium text-ink">{product.name}</p>
                        <p className="text-caption text-ink-muted">
                          {formatNaira(product.salePrice ?? product.price)}
                        </p>
                      </div>
                      <Badge tone={product.isAvailable ? "success" : "neutral"}>
                        {product.isAvailable ? "Live" : "Hidden"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {outstanding.length > 0 && (
            <Card>
              <CardHeader
                title="Finish setting up"
                subtitle={`${outstanding.length} step${outstanding.length === 1 ? "" : "s"} left`}
              />
              <CardBody className="space-y-3">
                {outstanding.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="group flex items-start gap-3 rounded-lg border border-neutral-200 p-3 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
                  >
                    <CircleAlert
                      className="mt-0.5 h-4 w-4 shrink-0 text-gold-deep"
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="block text-body font-medium text-ink">{item.label}</span>
                      <span className="block text-caption text-ink-muted">{item.detail}</span>
                    </span>
                    <ArrowRight
                      className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                ))}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader
              title={`${planDef.name} plan`}
              subtitle={
                plan === "FREE" ? "You are on the free plan" : "Your subscription is active"
              }
            />
            <CardBody>
              <div className="flex items-center justify-between text-caption">
                <span className="text-ink-secondary">Products used</span>
                <span className="font-medium text-ink">{usageLabel}</span>
              </div>
              {productLimit !== null && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className={`h-full rounded-full transition-all ${
                      usagePercent >= 100 ? "bg-warning" : "bg-navy-800"
                    }`}
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
              )}
              {plan === "FREE" ? (
                <div className="mt-4 border-t border-neutral-100 pt-4">
                  <p className="text-body font-medium text-ink">
                    {productCount >= (productLimit ?? 5)
                      ? "You have reached your product limit."
                      : "Need more products?"}
                  </p>
                  <p className="mt-1 text-caption text-ink-muted">
                    Starter gives you up to 50 products, more categories and your own colours.
                  </p>
                  <Link href="/dashboard/billing" className="mt-3 block">
                    <Button size="sm" className="w-full">
                      See plans
                    </Button>
                  </Link>
                </div>
              ) : (
                <Link
                  href="/dashboard/billing"
                  className="mt-4 inline-flex items-center gap-1.5 text-caption font-medium text-ink hover:underline"
                >
                  Manage billing
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
