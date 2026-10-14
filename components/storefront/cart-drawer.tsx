"use client";

// Cart drawer + checkout modal for the public storefront.
// Checkout collects optional details, shows the order total,
// records the order server-side, then opens WhatsApp.

import { useState, type FormEvent } from "react";
import Image from "next/image";
import {
  X,
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  MessageCircle,
  User,
  Phone,
  StickyNote,
  Lock,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { useCart } from "./cart-context";
import { formatNaira } from "@/lib/money";
import { buildWhatsAppOrderUrl } from "@/lib/whatsapp";
import type { StorefrontData } from "@/lib/storefront";
import type { StoreProduct } from "./product-card";
import { recordEvent } from "@/lib/analytics";

export function CartDrawer({
  open,
  onClose,
  store,
  onCheckout,
}: {
  open: boolean;
  onClose: () => void;
  store: StorefrontData;
  onCheckout: () => void;
}) {
  const cart = useCart();
  const t = store.theme.tokens;
  const lines = cart.totals.lines;

  return (
    <Dialog open={open} onClose={onClose} title="Your order" className="max-w-md">
      <div className="flex max-h-[70vh] flex-col">
        {lines.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: t.surfaceAlt, color: t.muted }}
            >
              <ShoppingBag className="h-6 w-6" />
            </span>
            <p
              className="mt-4 font-heading text-base font-semibold"
              style={{ color: t.text }}
            >
              Your order is empty
            </p>
            <p className="mt-1 text-sm" style={{ color: t.textSecondary }}>
              Tap the + button on any product to start your order.
            </p>
            <Button variant="outline" size="sm" className="mt-5" onClick={onClose}>
              Continue shopping
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {lines.map((line) => (
                <div
                  key={line.productId}
                  className="flex items-center gap-3 rounded-xl border p-2.5"
                  style={{ borderColor: t.border, background: t.bg }}
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg" style={{ background: t.surfaceAlt }}>
                    {line.imageUrl ? (
                      <Image src={line.imageUrl} alt={line.name} fill sizes="56px" className="object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center text-lg" style={{ color: t.muted }}>
                        ◆
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" style={{ color: t.text }}>
                      {line.name}
                    </p>
                    <p className="text-xs" style={{ color: t.textSecondary }}>
                      {formatNaira(line.effectivePriceKobo)} each
                    </p>
                    <div className="mt-1.5 flex items-center gap-1">
                      <button
                        onClick={() => cart.setQuantity(line.productId, line.quantity - 1)}
                        className="flex h-6 w-6 items-center justify-center rounded-md border"
                        style={{ borderColor: t.border, color: t.text }}
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold" style={{ color: t.text }}>
                        {line.quantity}
                      </span>
                      <button
                        onClick={() => cart.setQuantity(line.productId, line.quantity + 1)}
                        className="flex h-6 w-6 items-center justify-center rounded-md border"
                        style={{ borderColor: t.border, color: t.text }}
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: t.text }}>
                      {formatNaira(line.lineTotalKobo)}
                    </p>
                    <button
                      onClick={() => cart.remove(line.productId)}
                      className="mt-1 rounded-md p-1 transition-colors hover:text-[#C94B4B]"
                      style={{ color: t.muted }}
                      aria-label={`Remove ${line.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t px-5 py-4" style={{ borderColor: t.border }}>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between" style={{ color: t.textSecondary }}>
                  <span>Subtotal ({cart.count} items)</span>
                  <span className="font-medium" style={{ color: t.text }}>
                    {formatNaira(cart.totals.subtotalKobo)}
                  </span>
                </div>
                {cart.totals.savingsKobo > 0 && (
                  <div className="flex justify-between" style={{ color: "#16845B" }}>
                    <span>Sale savings</span>
                    <span className="font-medium">-{formatNaira(cart.totals.savingsKobo)}</span>
                  </div>
                )}
                <div
                  className="flex justify-between border-t pt-2 text-base font-bold"
                  style={{ borderColor: t.border, color: t.text }}
                >
                  <span>Total</span>
                  <span>{formatNaira(cart.totals.totalKobo)}</span>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={onClose}>
                  Continue shopping
                </Button>
                <Button
                  variant="gold"
                  className="flex-1"
                  onClick={onCheckout}
                  style={{ background: "#075E54" }}
                >
                  <MessageCircle className="h-4 w-4" />
                  Review order
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}

export function CheckoutModal({
  open,
  onClose,
  store,
  products,
  onOrderPlaced,
}: {
  open: boolean;
  onClose: () => void;
  store: StorefrontData;
  products: StoreProduct[];
  onOrderPlaced: (whatsappUrl: string) => void;
}) {
  const cart = useCart();
  const t = store.theme.tokens;
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lines = cart.totals.lines;
  const whatsappNumber = store.business.whatsappNumber;

  async function placeOrder(e: FormEvent) {
    e.preventDefault();
    if (lines.length === 0) return;
    if (!whatsappNumber) {
      setError("This store has not added a WhatsApp number yet.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      // Record the order server-side (with price snapshots).
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
          customerName: name.trim() || null,
          customerPhone: phone.trim() || null,
          customerNote: note.trim() || null,
          sessionId: getSessionId(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not create order");
      }

      // Build the WhatsApp message and open it.
      const payload = {
        businessName: store.business.name,
        whatsappNumber,
        lines: lines.map((l) => ({
          name: l.name,
          quantity: l.quantity,
          priceKobo: l.priceKobo,
          subtotalKobo: l.lineTotalKobo,
        })),
        subtotalKobo: cart.totals.subtotalKobo,
        discountKobo: cart.totals.savingsKobo,
        totalKobo: cart.totals.totalKobo,
        customerName: name.trim() || null,
        customerPhone: phone.trim() || null,
        customerNote: note.trim() || null,
      };
      const url = buildWhatsAppOrderUrl(payload);
      if (!url) throw new Error("Invalid WhatsApp number");

      onOrderPlaced(url);
      cart.clear();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Checkout" className="max-w-md">
      <form onSubmit={(e) => void placeOrder(e)} className="space-y-4 px-5 py-5">
        {lines.length === 0 ? (
          <p className="py-6 text-center text-sm" style={{ color: t.textSecondary }}>
            Your order is empty.
          </p>
        ) : (
          <>
            {/* Order summary */}
            <div
              className="rounded-xl border p-3.5"
              style={{ borderColor: t.border, background: t.surface }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: t.muted }}>
                Your order
              </p>
              <div className="mt-2 space-y-1.5">
                {lines.map((l) => (
                  <div key={l.productId} className="flex justify-between gap-3 text-[13px]">
                    <span className="truncate" style={{ color: t.text }}>
                      {l.name} <span style={{ color: t.muted }}>×{l.quantity}</span>
                    </span>
                    <span className="font-medium" style={{ color: t.text }}>
                      {formatNaira(l.lineTotalKobo)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 space-y-1 border-t pt-2 text-[13px]" style={{ borderColor: t.border }}>
                <div className="flex justify-between" style={{ color: t.textSecondary }}>
                  <span>Subtotal</span>
                  <span>{formatNaira(cart.totals.subtotalKobo)}</span>
                </div>
                {cart.totals.savingsKobo > 0 && (
                  <div className="flex justify-between" style={{ color: "#16845B" }}>
                    <span>Sale savings</span>
                    <span>-{formatNaira(cart.totals.savingsKobo)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[17px] font-bold" style={{ color: t.text }}>
                  <span>TOTAL</span>
                  <span>{formatNaira(cart.totals.totalKobo)}</span>
                </div>
              </div>
            </div>

            {/* Customer details */}
            <Field label="Your name (optional)" htmlFor="co-name">
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: t.muted }} />
                <Input id="co-name" className="pl-10" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. David" autoComplete="name" />
              </div>
            </Field>
            <Field label="Your phone (optional)" htmlFor="co-phone" hint="The store may use this to confirm your order.">
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: t.muted }} />
                <Input id="co-phone" className="pl-10" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0801 234 5678" autoComplete="tel" />
              </div>
            </Field>
            <Field label="Note to seller (optional)" htmlFor="co-note">
              <div className="relative">
                <StickyNote className="absolute left-3.5 top-3 h-4 w-4" style={{ color: t.muted }} />
                <Input id="co-note" className="pl-10" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Please confirm availability" maxLength={500} />
              </div>
            </Field>

            {error && (
              <p className="rounded-xl bg-[#F9E9E9] px-3.5 py-2.5 text-[13px] text-[#C94B4B]" role="alert">
                {error}
              </p>
            )}

            <Button
              type="submit"
              variant="gold"
              size="lg"
              className="w-full"
              loading={sending}
              style={{ background: "#075E54" }}
            >
              <MessageCircle className="h-5 w-5" />
              ORDER VIA WHATSAPP
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-[11px]" style={{ color: t.muted }}>
              <Lock className="h-3 w-3" />
              Opens WhatsApp with your order — no account needed.
            </p>
          </>
        )}
      </form>
    </Dialog>
  );
}

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem("pl_session");
  if (!id) {
    id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem("pl_session", id);
  }
  return id;
}

void recordEvent;
