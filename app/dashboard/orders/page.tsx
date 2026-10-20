"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ShoppingBag,
  MessageCircle,
  Check,
  Phone,
  User,
  StickyNote,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { formatNaira } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { normalizeWhatsAppNumber, buildOrderMessage } from "@/lib/whatsapp";

type OrderStatus = "NEW" | "CONTACTED" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

interface OrderItem {
  productNameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  subtotal: number;
}

interface Order {
  id: string;
  customerName: string | null;
  customerPhone: string | null;
  customerNote: string | null;
  subtotal: number;
  discount: number;
  total: number;
  status: OrderStatus;
  source: string;
  createdAt: string;
  items: OrderItem[];
  displayTotal: string;
}

const STATUS_TONES: Record<
  OrderStatus,
  "brand" | "warning" | "success" | "danger" | "neutral"
> = {
  NEW: "neutral",
  CONTACTED: "warning",
  CONFIRMED: "brand",
  COMPLETED: "success",
  CANCELLED: "danger",
};

export default function OrdersPage() {
  const toast = useToast();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/orders");
    const data = await res.json();
    setOrders(data.orders ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!orders) return [];
    if (statusFilter === "ALL") return orders;
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: orders?.length ?? 0 };
    for (const o of orders ?? []) c[o.status] = (c[o.status] ?? 0) + 1;
    return c;
  }, [orders]);

  async function setStatus(order: Order, status: OrderStatus) {
    setUpdating(order.id);
    const res = await fetch("/api/orders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.id, status }),
    });
    setUpdating(null);
    if (!res.ok) {
      toast.error("Could not update status", "Please try again.");
      return;
    }
    toast.success("Order updated", `Status changed to ${status.toLowerCase()}.`);
    await load();
  }

  function openWhatsApp(order: Order) {
    // Reply via WhatsApp using the customer's number if provided,
    // otherwise the business's own WhatsApp thread is used by the owner.
    const number = normalizeWhatsAppNumber(order.customerPhone ?? "");
    const message = encodeURIComponent(
      number
        ? `Hello ${order.customerName ?? "there"},\n\nThis is regarding your recent order (${order.displayTotal}):\n${order.items.map((i) => `• ${i.productNameSnapshot} ×${i.quantity}`).join("\n")}\n\nThanks for your order!`
        : `Order ${order.id.slice(0, 8).toUpperCase()} — ${order.displayTotal}`,
    );
    const target = number ? `https://wa.me/${number}?text=${message}` : "#";
    if (number) window.open(target, "_blank", "noreferrer");
  }

  return (
    <DashboardLayout userName={null}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-headline font-semibold text-ink">
            Orders
          </h1>
          <p className="mt-1 text-caption text-ink-muted">
            Orders customers send through WhatsApp. PRICELIST records them —
            payment happens in your WhatsApp conversation.
          </p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="mb-5 flex flex-wrap gap-2">
        {(["ALL", "NEW", "CONTACTED", "CONFIRMED", "COMPLETED", "CANCELLED"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3.5 py-1.5 text-caption font-medium transition-colors ${
              statusFilter === s
                ? "bg-navy-900 text-white"
                : "border border-neutral-300 bg-white text-ink-secondary hover:border-navy-400"
            }`}
          >
            {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            <span className="ml-1.5 opacity-60">{counts[s] ?? 0}</span>
          </button>
        ))}
      </div>

      {orders === null ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-neutral-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="h-5 w-5" />}
          title={statusFilter === "ALL" ? "No orders yet" : "No orders with this status"}
          description="When customers order through WhatsApp, they'll appear here. Share your store link to get started."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <div
              key={order.id}
              className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-soft transition-shadow hover:shadow-lift"
            >
              <button
                onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left"
                aria-expanded={expanded === order.id}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-50 text-navy-700">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-semibold text-ink">
                    {order.customerName || "WhatsApp customer"}
                  </p>
                  <p className="text-caption text-ink-muted">
                    {order.items.length} item{order.items.length === 1 ? "" : "s"} ·{" "}
                    {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-body font-semibold text-ink">{formatNaira(order.total)}</p>
                  <Badge tone={STATUS_TONES[order.status]} dot>
                    {order.status}
                  </Badge>
                </div>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-ink-muted transition-transform ${
                    expanded === order.id ? "rotate-180" : ""
                  }`}
                />
              </button>

              {expanded === order.id && (
                <div className="border-t border-neutral-100 px-5 py-4 animate-fade-in">
                  <div className="grid gap-5 sm:grid-cols-2">
                    {/* Items */}
                    <div>
                      <p className="text-caption font-medium text-ink-secondary">Your order</p>
                      <div className="mt-2 divide-y divide-neutral-100 rounded-xl border border-neutral-100">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                            <div className="min-w-0">
                              <p className="truncate text-caption font-medium text-ink">
                                {item.productNameSnapshot}
                              </p>
                              <p className="text-caption text-ink-muted">
                                Qty {item.quantity} × {formatNaira(item.priceSnapshot)}
                              </p>
                            </div>
                            <p className="text-caption font-semibold text-ink">
                              {formatNaira(item.subtotal)}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 space-y-1 px-1 text-caption">
                        <div className="flex justify-between text-ink-secondary">
                          <span>Subtotal</span>
                          <span>{formatNaira(order.subtotal)}</span>
                        </div>
                        {order.discount > 0 && (
                          <div className="flex justify-between text-success">
                            <span>Sale savings</span>
                            <span>-{formatNaira(order.discount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-neutral-100 pt-1.5 text-title font-semibold text-ink">
                          <span>Total</span>
                          <span>{formatNaira(order.total)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Customer */}
                    <div className="space-y-4">
                      <div>
                        <p className="text-caption font-medium text-ink-secondary">Customer</p>
                        <div className="mt-2 space-y-2">
                          <p className="flex items-center gap-2 text-body text-ink">
                            <User className="h-4 w-4 text-ink-muted" />
                            {order.customerName || "Not provided"}
                          </p>
                          <p className="flex items-center gap-2 text-body text-ink">
                            <Phone className="h-4 w-4 text-ink-muted" />
                            {order.customerPhone || "Not provided"}
                          </p>
                          {order.customerNote && (
                            <p className="flex items-start gap-2 rounded-xl bg-neutral-50 p-3 text-body text-ink-secondary">
                              <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-gold-deep" />
                              {order.customerNote}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {order.customerPhone ? (
                          <Button variant="outline" size="sm" onClick={() => openWhatsApp(order)}>
                            <MessageCircle className="h-3.5 w-3.5 text-whatsapp" />
                            Reply on WhatsApp
                          </Button>
                        ) : null}
                      </div>

                      <div>
                        <p className="mb-2 text-caption font-medium text-ink-secondary">
                          Update status
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {(
                            ["CONTACTED", "CONFIRMED", "COMPLETED", "CANCELLED"] as OrderStatus[]
                          ).map((s) => (
                            <Button
                              key={s}
                              size="sm"
                              variant={order.status === s ? "primary" : "outline"}
                              loading={updating === order.id}
                              onClick={() => void setStatus(order, s)}
                            >
                              {s === "CONTACTED" && "Contacted"}
                              {s === "CONFIRMED" && <><Check className="h-3.5 w-3.5" /> Confirmed</>}
                              {s === "COMPLETED" && <><Check className="h-3.5 w-3.5" /> Completed</>}
                              {s === "CANCELLED" && <><AlertCircle className="h-3.5 w-3.5" /> Cancel</>}
                            </Button>
                          ))}
                        </div>
                        {order.status === "NEW" && (
                          <p className="mt-2 flex items-center gap-1.5 text-caption text-ink-muted">
                            <AlertCircle className="h-3.5 w-3.5 text-warning" />
                            New order — confirm with the customer on WhatsApp.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info banner */}
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-whatsapp" />
        <p className="text-caption leading-relaxed text-ink-secondary">
          PRICELIST records orders when customers tap &quot;Send order on WhatsApp&quot;. Payments are
          completed in your WhatsApp conversation — PRICELIST does not process payments.
          Mark orders as confirmed once the customer completes payment.
        </p>
      </div>
    </DashboardLayout>
  );
}

void Select;
