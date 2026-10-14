"use client";

// Overlay components for the storefront: search, share, QR, product view,
// sticky order bar, and small presentational helpers.

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Search,
  X,
  QrCode,
  Share2,
  Copy,
  Check,
  Minus,
  Plus,
  ShoppingBag,
  MessageCircle,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { StorefrontData } from "@/lib/storefront";
import type { StoreProduct } from "./product-card";
import { useCart } from "./cart-context";
import { formatNaira } from "@/lib/money";
import {
  buildWhatsAppShareUrl,
  buildGenericShareUrl,
} from "@/lib/whatsapp";

/* ---------- Category chip ---------- */

export function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-medium transition-all duration-150 ${
        active ? "shadow-sm" : ""
      }`}
      style={{
        background: active ? "var(--pl-primary)" : "var(--pl-surface-alt)",
        color: active ? "var(--pl-on-primary)" : "var(--pl-text-secondary)",
      }}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

/* ---------- Social link ---------- */

export function SocialLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  const safeHref = /^https?:\/\//i.test(href) ? href : `https://${href}`;
  return (
    <a
      href={safeHref}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-xl border transition-colors"
      style={{
        borderColor: "var(--pl-border)",
        color: "var(--pl-text-secondary)",
        background: "var(--pl-surface)",
      }}
    >
      {icon}
    </a>
  );
}

/* ---------- Sticky mobile order bar ---------- */

export function StickyOrderBar({
  store,
  onOpenCart,
}: {
  store: StorefrontData;
  onOpenCart: () => void;
}) {
  const cart = useCart();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 240);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (cart.count === 0) return null;

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-30 px-4 pb-4 transition-all duration-200 sm:hidden ${
        visible ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0"
      }`}
      style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
    >
      <button
        onClick={onOpenCart}
        className="flex h-[52px] w-full items-center justify-between rounded-2xl px-5 text-white shadow-lift"
        style={{ background: "#075E54" }}
        aria-label={`View order, ${cart.count} items, total ${formatNaira(cart.totals.totalKobo)}`}
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <ShoppingBag className="h-4.5 w-4.5" />
          {cart.count} item{cart.count === 1 ? "" : "s"}
        </span>
        <span className="flex items-center gap-3">
          <span className="font-heading text-base font-bold">
            {formatNaira(cart.totals.totalKobo)}
          </span>
          <span className="rounded-lg bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wide">
            View order
          </span>
        </span>
      </button>
    </div>
  );
}

/* ---------- Search overlay ---------- */

export function SearchOverlay({
  open,
  onClose,
  query,
  setQuery,
  results,
  onView,
  onAdd,
  store,
}: {
  open: boolean;
  onClose: () => void;
  query: string;
  setQuery: (q: string) => void;
  results: StoreProduct[];
  onView: (p: StoreProduct) => void;
  onAdd: (id: string) => void;
  store: StorefrontData;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} title="Search products" className="max-w-md">
      <div className="px-5 py-4">
        <div
          className="relative rounded-xl border"
          style={{ borderColor: "var(--pl-border)" }}
        >
          <Search
            className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: "var(--pl-muted)" }}
          />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products…"
            className="border-0 pl-10 shadow-none focus-visible:ring-0"
            aria-label="Search products"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--pl-muted)" }}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-4 max-h-[50vh] space-y-2 overflow-y-auto">
          {results.length === 0 ? (
            <p className="py-8 text-center text-sm" style={{ color: "var(--pl-text-secondary)" }}>
              {query ? `No results for "${query}"` : "Type to search the catalog"}
            </p>
          ) : (
            results.slice(0, 20).map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  onClose();
                  onView(p);
                }}
                className="flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors"
                style={{
                  borderColor: "var(--pl-border)",
                  background: "var(--pl-surface)",
                }}
              >
                <span
                  className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg"
                  style={{ background: "var(--pl-surface-alt)" }}
                >
                  {p.imageUrl ? (
                    <Image src={p.imageUrl} alt={p.name} fill sizes="48px" className="object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center" style={{ color: "var(--pl-muted)" }}>
                      ◆
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium" style={{ color: "var(--pl-text)" }}>
                    {p.name}
                  </span>
                  <span className="text-xs" style={{ color: "var(--pl-text-secondary)" }}>
                    {p.salePriceKobo && p.salePriceKobo < p.priceKobo
                      ? formatNaira(p.salePriceKobo)
                      : formatNaira(p.priceKobo)}
                  </span>
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdd(p.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.stopPropagation();
                      onAdd(p.id);
                    }
                  }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: "var(--pl-primary)", color: "var(--pl-on-primary)" }}
                  aria-label={`Add ${p.name}`}
                >
                  <Plus className="h-4 w-4" />
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </Dialog>
  );
}

/* ---------- Share dialog ---------- */

export function ShareDialog({
  open,
  onClose,
  storeUrl,
  businessName,
  copied,
  setCopied,
  onOpenQr,
}: {
  open: boolean;
  onClose: () => void;
  storeUrl: string;
  businessName: string;
  copied: boolean;
  setCopied: (v: boolean) => void;
  onOpenQr: () => void;
}) {
  const shareMessage = `Check out my products and prices on PRICELIST 👇\n${storeUrl}`;
  const waUrl = buildWhatsAppShareUrl(storeUrl, businessName);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API may be blocked; user can copy manually
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Share your store" className="max-w-sm">
      <div className="space-y-3 px-5 py-5">
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--pl-text-secondary)" }}>
          Share your link anywhere — WhatsApp status, Instagram bio, flyers,
          business cards.
        </p>

        <a
          href={waUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.01]"
          style={{ background: "#075E54" }}
        >
          <MessageCircle className="h-5 w-5" />
          Share on WhatsApp
        </a>
        <a
          href={buildGenericShareUrl("facebook", storeUrl, businessName)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-colors"
          style={{ borderColor: "var(--pl-border)", color: "var(--pl-text)", background: "var(--pl-surface)" }}
        >
          <Share2 className="h-4.5 w-4.5" />
          Share on Facebook
        </a>
        <a
          href={buildGenericShareUrl("x", storeUrl, businessName)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-colors"
          style={{ borderColor: "var(--pl-border)", color: "var(--pl-text)", background: "var(--pl-surface)" }}
        >
          <span className="font-black">X</span>
          Post on X
        </a>
        <button
          onClick={onOpenQr}
          className="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-colors"
          style={{ borderColor: "var(--pl-border)", color: "var(--pl-text)", background: "var(--pl-surface)" }}
        >
          <QrCode className="h-4.5 w-4.5" />
          Show QR code
        </button>
        <button
          onClick={() => void copyLink()}
          className="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-colors"
          style={{ borderColor: "var(--pl-border)", color: "var(--pl-text)", background: "var(--pl-surface)" }}
        >
          {copied ? (
            <Check className="h-4.5 w-4.5 text-[#16845B]" />
          ) : (
            <Copy className="h-4.5 w-4.5" />
          )}
          {copied ? "Link copied" : "Copy link"}
        </button>

        <div
          className="rounded-xl p-3.5 text-[13px]"
          style={{ background: "var(--pl-surface-alt)", color: "var(--pl-text-secondary)" }}
        >
          Share message:
          <p className="mt-1.5 whitespace-pre-wrap text-xs" style={{ color: "var(--pl-text)" }}>
            {shareMessage}
          </p>
        </div>
      </div>
    </Dialog>
  );
}

/* ---------- QR dialog ---------- */

export function QrDialog({
  open,
  onClose,
  qrData,
  storeUrl,
}: {
  open: boolean;
  onClose: () => void;
  qrData: string | null;
  storeUrl: string;
}) {
  return (
    <Dialog open={open} onClose={onClose} title="Store QR code" className="max-w-sm">
      <div className="flex flex-col items-center px-5 py-6">
        {qrData ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrData}
            alt={`QR code for ${storeUrl}`}
            className="h-52 w-52 rounded-2xl border border-navy-100"
          />
        ) : (
          <div className="flex h-52 w-52 items-center justify-center rounded-2xl bg-navy-50">
            <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-navy-200 border-t-navy-800" />
          </div>
        )}
        <p className="mt-4 break-all text-center text-[13px] font-medium text-navy-800">
          {storeUrl}
        </p>
        <p className="mt-1 text-center text-xs text-ink-muted">
          Print this on flyers, packaging or business cards.
        </p>
        {qrData && (
          <Button
            variant="outline"
            size="sm"
            className="mt-5"
            onClick={() => {
              const a = document.createElement("a");
              a.href = qrData;
              a.download = "pricelist-qr.png";
              a.click();
            }}
          >
            Download QR code
          </Button>
        )}
      </div>
    </Dialog>
  );
}

/* ---------- Product view modal ---------- */

export function ProductViewModal({
  product,
  store,
  onClose,
  onAdd,
}: {
  product: StoreProduct | null;
  store: StorefrontData;
  onClose: () => void;
  onAdd: (id: string) => void;
}) {
  const cart = useCart();
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setQty(1);
  }, [product?.id]);

  if (!product) return <Dialog open={false} onClose={onClose} title=""><></></Dialog>;

  const hasSale =
    product.salePriceKobo !== null &&
    product.salePriceKobo > 0 &&
    product.salePriceKobo < product.priceKobo;

  return (
    <Dialog open onClose={onClose} wide className="max-w-2xl">
      <div className="grid sm:grid-cols-2">
        <div
          className="relative min-h-[240px] sm:min-h-[380px]"
          style={{ background: "var(--pl-surface-alt)" }}
        >
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          ) : (
            <span
              className="flex h-full items-center justify-center font-heading text-7xl"
              style={{ color: "var(--pl-muted)" }}
            >
              {product.type === "SERVICE" ? "✦" : "◆"}
            </span>
          )}
        </div>
        <div className="flex flex-col p-6">
          <p
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--pl-muted)" }}
          >
            {product.type === "SERVICE" ? "Service" : "Product"}
          </p>
          <h3
            className={`mt-1.5 text-2xl font-bold ${
              store.theme.fonts.heading === "serif" ? "font-serif" : "font-heading"
            }`}
            style={{ color: "var(--pl-text)" }}
          >
            {product.name}
          </h3>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span
              className="font-heading text-2xl font-bold"
              style={{ color: hasSale ? "#C94B4B" : "var(--pl-text)" }}
            >
              {formatNaira(hasSale ? product.salePriceKobo! : product.priceKobo)}
            </span>
            {hasSale && (
              <span className="text-sm line-through" style={{ color: "var(--pl-muted)" }}>
                {formatNaira(product.priceKobo)}
              </span>
            )}
          </div>
          {product.description && (
            <p
              className="mt-3 text-sm leading-relaxed"
              style={{ color: "var(--pl-text-secondary)" }}
            >
              {product.description}
            </p>
          )}

          <div className="mt-6 flex items-center gap-3">
            <div
              className="flex items-center rounded-xl border"
              style={{ borderColor: "var(--pl-border)" }}
            >
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="flex h-11 w-11 items-center justify-center"
                style={{ color: "var(--pl-text)" }}
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center font-semibold" style={{ color: "var(--pl-text)" }}>
                {qty}
              </span>
              <button
                onClick={() => setQty(Math.min(999, qty + 1))}
                className="flex h-11 w-11 items-center justify-center"
                style={{ color: "var(--pl-text)" }}
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Button
              variant="gold"
              size="lg"
              className="flex-1"
              style={{ background: "var(--pl-primary)", color: "var(--pl-on-primary)" }}
              onClick={() => {
                for (let i = 0; i < qty; i++) cart.add(product.id);
                onAdd(product.id);
                onClose();
              }}
            >
              Add to order — {formatNaira((hasSale ? product.salePriceKobo! : product.priceKobo) * qty)}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
