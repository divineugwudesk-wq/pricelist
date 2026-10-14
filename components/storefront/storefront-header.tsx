"use client";

// Storefront header — the premium first impression of every store.
import Image from "next/image";
import { MapPin, MessageCircle, Search, ShoppingBag, Share2, Menu, X } from "lucide-react";
import type { StorefrontData } from "@/lib/storefront";

export function StorefrontHeader({
  store,
  onSearch,
  onCart,
  onShare,
  cartCount,
}: {
  store: StorefrontData;
  onSearch: () => void;
  onCart: () => void;
  onShare: () => void;
  cartCount: number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const b = store.business;
  const dark = store.theme.dark;

  return (
    <header
      className="sticky top-0 z-30 border-b backdrop-blur"
      style={{
        background: `color-mix(in srgb, ${store.theme.tokens.bg} 88%, transparent)`,
        borderColor: store.theme.tokens.border,
      }}
    >
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3.5 sm:px-6">
        {b.logoUrl ? (
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl bg-navy-50">
            <Image
              src={b.logoUrl}
              alt={`${b.name} logo`}
              fill
              sizes="44px"
              className="object-cover"
              priority
            />
          </div>
        ) : (
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-heading text-lg font-bold"
            style={{ background: store.theme.tokens.primary, color: store.theme.tokens.onPrimary }}
          >
            {b.name.slice(0, 2).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1
            className={`truncate text-[17px] font-bold leading-tight ${
              store.theme.fonts.heading === "serif" ? "font-serif" : "font-heading"
            }`}
            style={{ color: store.theme.tokens.text }}
          >
            {b.name}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]" style={{ color: store.theme.tokens.textSecondary }}>
            <span>{b.category}</span>
            {b.address && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{b.address}</span>
              </span>
            )}
            <span
              className="flex items-center gap-1 font-medium"
              style={{ color: store.isOpen ? "#16845B" : "#C94B4B" }}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${store.isOpen ? "animate-pulse" : ""}`}
                style={{ background: store.isOpen ? "#16845B" : "#C94B4B" }}
              />
              {store.isOpen ? "Open" : "Closed"}
            </span>
          </div>
        </div>

        {/* Desktop actions */}
        <div className="hidden items-center gap-1.5 sm:flex">
          <button
            onClick={onSearch}
            className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors"
            style={{ color: store.theme.tokens.textSecondary }}
            aria-label="Search products"
            onMouseEnter={(e) => (e.currentTarget.style.background = store.theme.tokens.surface)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Search className="h-[18px] w-[18px]" />
          </button>
          <button
            onClick={onShare}
            className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors"
            style={{ color: store.theme.tokens.textSecondary }}
            aria-label="Share store"
            onMouseEnter={(e) => (e.currentTarget.style.background = store.theme.tokens.surface)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Share2 className="h-[18px] w-[18px]" />
          </button>
          <button
            onClick={onCart}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors"
            style={{ color: store.theme.tokens.textSecondary }}
            aria-label={`Cart, ${cartCount} items`}
            onMouseEnter={(e) => (e.currentTarget.style.background = store.theme.tokens.surface)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <ShoppingBag className="h-[18px] w-[18px]" />
            {cartCount > 0 && (
              <span
                className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] font-bold"
                style={{ background: store.theme.tokens.accent, color: store.theme.tokens.onAccent }}
              >
                {cartCount}
              </span>
            )}
          </button>
          {b.whatsappNumber && (
            <WhatsAppButton store={store} compact />
          )}
        </div>

        {/* Mobile menu */}
        <button
          className="flex h-10 w-10 items-center justify-center sm:hidden"
          style={{ color: store.theme.tokens.textSecondary }}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t px-4 py-3 sm:hidden animate-slide-down" style={{ borderColor: store.theme.tokens.border }}>
          <div className="mb-3 flex gap-2">
            <button
              onClick={() => { setMenuOpen(false); onSearch(); }}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-[13px] font-medium"
              style={{ background: store.theme.tokens.surface, color: store.theme.tokens.text }}
            >
              <Search className="h-4 w-4" /> Search
            </button>
            <button
              onClick={() => { setMenuOpen(false); onShare(); }}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-[13px] font-medium"
              style={{ background: store.theme.tokens.surface, color: store.theme.tokens.text }}
            >
              <Share2 className="h-4 w-4" /> Share
            </button>
            <button
              onClick={() => { setMenuOpen(false); onCart(); }}
              className="relative flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-[13px] font-medium"
              style={{ background: store.theme.tokens.surface, color: store.theme.tokens.text }}
            >
              <ShoppingBag className="h-4 w-4" /> Cart ({cartCount})
            </button>
          </div>
          {b.whatsappNumber && <WhatsAppButton store={store} />}
        </div>
      )}
    </header>
  );
}

import { useState } from "react";
import { normalizeWhatsAppNumber, buildWhatsAppShareUrl } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";

export function WhatsAppButton({
  store,
  compact,
}: {
  store: StorefrontData;
  compact?: boolean;
}) {
  const number = normalizeWhatsAppNumber(store.business.whatsappNumber ?? "");
  if (!number) return null;
  const href = buildWhatsAppShareUrl(
    `${typeof window !== "undefined" ? window.location.origin : ""}/${store.business.slug}`,
    store.business.name,
  );
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
    >
      <Button
        variant="gold"
        size={compact ? "sm" : "md"}
        className="gap-1.5"
        style={{ background: "#075E54" }}
      >
        <MessageCircle className="h-4 w-4" />
        {compact ? "Chat" : "Chat with us"}
      </Button>
    </a>
  );
}
