"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Palette,
  Check,
  Upload,
  X,
  QrCode,
  Share2,
  Link2,
  Download,
  CreditCard,
  Monitor,
  Tablet,
  Smartphone,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Field } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ACCENT_COLORS, THEMES, type Theme } from "@/lib/themes";
import { getTheme } from "@/lib/themes";
import { isPaystackConfigured } from "@/lib/paystack";

interface BusinessData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  theme: string;
  accentColor: string | null;
  showBranding: boolean;
  heroImageUrl: string | null;
  whatsappNumber: string | null;
}

type PreviewMode = "desktop" | "tablet" | "mobile";

export default function StoreCustomizePage() {
  const toast = useToast();
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [themeId, setThemeId] = useState("classic");
  const [accent, setAccent] = useState("#C9A45C");
  const [showBranding, setShowBranding] = useState(true);
  const [heroUrl, setHeroUrl] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  const [plan, setPlan] = useState("FREE");
  const [qr, setQr] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const heroInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/businesses");
    const data = await res.json();
    if (!data.business) return;
    const b: BusinessData = data.business;
    setBusiness(b);
    setThemeId(b.theme);
    setAccent(b.accentColor ?? "#C9A45C");
    setShowBranding(b.showBranding);
    setHeroUrl(b.heroImageUrl);
    setDescription(b.description ?? "");

    const subRes = await fetch("/api/subscription");
    const subData = await subRes.json();
    setPlan(subData.plan ?? "FREE");

    const { generateQrDataUrl } = await import("@/lib/qr");
    const url = `${location.origin}/${b.slug}`;
    setQr(await generateQrDataUrl(url, 400));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const theme: Theme = getTheme(themeId);
  const isPro = plan === "PRO";
  const storeUrl = business ? `${location.origin}/${business.slug}` : "";

  function markDirty() {
    setDirty(true);
  }

  async function save() {
    if (!business) return;
    setSaving(true);
    const res = await fetch(`/api/businesses/${business.id}/customize`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        theme: themeId,
        accentColor: accent,
        showBranding,
        heroImageUrl: heroUrl,
        description,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      toast.error(
        data.error ?? "Could not save",
        data.code ? "That feature needs a higher plan." : "Please try again.",
      );
      return;
    }
    setBusiness(data.business);
    setDirty(false);
    toast.success("Store updated", "Your storefront looks great.");
  }

  async function uploadHero(file: File) {
    const MAX = 5 * 1024 * 1024;
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      toast.error("Unsupported file type", "Use PNG, JPG, WEBP or GIF.");
      return;
    }
    if (file.size > MAX) {
      toast.error("Image too large", "Maximum size is 5 MB.");
      return;
    }
    setUploadingHero(true);
    try {
      const dataUrl = await readFile(file);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          data: dataUrl.split(",")[1],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("Upload failed", data.error ?? "Please try another image.");
        return;
      }
      setHeroUrl(data.url);
      markDirty();
    } finally {
      setUploadingHero(false);
    }
  }

  if (!business) {
    return (
      <DashboardLayout userName={null}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-56 rounded-lg bg-navy-100" />
          <div className="h-72 rounded-2xl bg-navy-100" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userName={null} storeSlug={business.slug}>
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-navy-900">
            Customize Store
          </h1>
          <p className="mt-1 text-[13px] text-ink-muted">
            Watch your storefront update live as you make changes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/${business.slug}`} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">
              View live store
            </Button>
          </a>
          <Button onClick={() => void save()} loading={saving} disabled={!dirty && saving === false ? false : false} className={dirty ? "" : "opacity-60"}>
            <Check className="h-4 w-4" />
            Save changes
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Controls */}
        <div className="space-y-5 lg:col-span-2">
          {/* Theme */}
          <div className="rounded-3xl border border-navy-100 bg-white p-6 shadow-soft">
            <p className="flex items-center gap-2 text-[13px] font-medium text-ink-secondary">
              <Palette className="h-4 w-4" />
              Theme
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {Object.values(THEMES).map((t) => {
                const accessible = t.tier === "free" || isPro;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      if (!accessible) {
                        toast.info(
                          `${t.name} is a Pro theme`,
                          "Upgrade to Pro to unlock all premium themes.",
                        );
                        return;
                      }
                      setThemeId(t.id);
                      markDirty();
                    }}
                    className={`rounded-2xl border-2 p-3 text-left transition-all ${
                      themeId === t.id
                        ? "border-navy-800 shadow-soft"
                        : "border-navy-100 hover:border-navy-300"
                    } ${!accessible ? "opacity-70" : ""}`}
                  >
                    <div className="flex h-12 overflow-hidden rounded-lg">
                      <span className="flex-1" style={{ background: t.tokens.bg }} />
                      <span className="flex-1" style={{ background: t.tokens.primary }} />
                      <span className="w-4" style={{ background: t.tokens.accent }} />
                    </div>
                    <p className="mt-2 flex items-center justify-between text-xs font-medium text-ink">
                      {t.name}
                      {t.tier === "pro" && (
                        <span className="rounded bg-gold-faint px-1.5 py-0.5 text-[9px] font-semibold text-gold-deep">
                          PRO
                        </span>
                      )}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Accent */}
          <div className="rounded-3xl border border-navy-100 bg-white p-6 shadow-soft">
            <p className="text-[13px] font-medium text-ink-secondary">Accent color</p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    if (!isPro) {
                      toast.info("Accent colors are a Pro feature", "Upgrade to Pro to customize your accent.");
                      return;
                    }
                    setAccent(c.value);
                    markDirty();
                  }}
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition-transform hover:scale-110 ${
                    accent === c.value ? "ring-2 ring-navy-800 ring-offset-2" : ""
                  }`}
                  style={{ background: c.value }}
                  title={c.name}
                  aria-label={`Accent color ${c.name}`}
                >
                  {accent === c.value && <Check className="h-4 w-4 text-white" />}
                </button>
              ))}
            </div>
            {!isPro && (
              <p className="mt-3 text-xs text-ink-muted">
                <a href="/dashboard/billing" className="font-medium text-navy-700 underline">
                  Upgrade to Pro
                </a>{" "}
                to customize accent colors.
              </p>
            )}
          </div>

          {/* Branding + hero */}
          <div className="rounded-3xl border border-navy-100 bg-white p-6 shadow-soft">
            <p className="text-[13px] font-medium text-ink-secondary">Branding & banner</p>
            <div className="mt-4 space-y-4">
              <label className="flex items-center justify-between rounded-xl border border-navy-100 px-4 py-3">
                <span>
                  <span className="block text-sm font-medium text-ink">PRICELIST branding</span>
                  <span className="text-xs text-ink-muted">
                    {isPro ? "Show 'Powered by PRICELIST' on your store" : "Free plan shows PRICELIST branding"}
                  </span>
                </span>
                <Switch
                  checked={showBranding}
                  onChange={(checked) => {
                    if (!checked && !isPro) {
                      toast.info("A Pro feature", "Upgrade to Pro to remove PRICELIST branding.");
                      return;
                    }
                    setShowBranding(checked);
                    markDirty();
                  }}
                  label="Show branding"
                />
              </label>

              <div>
                <p className="mb-2 text-sm text-ink">Hero / banner image</p>
                {heroUrl ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={heroUrl} alt="Store banner" className="h-28 w-full rounded-xl object-cover" />
                    <button
                      onClick={() => {
                        if (!isPro) return;
                        setHeroUrl(null);
                        markDirty();
                      }}
                      className="absolute right-2 top-2 rounded-lg bg-white/90 p-1.5 text-ink shadow"
                      aria-label="Remove banner"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (!isPro) {
                        toast.info("A Pro feature", "Upgrade to Pro to add a hero banner.");
                        return;
                      }
                      heroInputRef.current?.click();
                    }}
                    className="flex h-28 w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-navy-200 text-ink-muted transition-colors hover:border-navy-400"
                  >
                    {uploadingHero ? (
                      <span className="h-6 w-6 animate-spin rounded-full border-2 border-navy-200 border-t-navy-800" />
                    ) : (
                      <Upload className="h-5 w-5" />
                    )}
                    <span className="text-xs font-medium">
                      {isPro ? "Upload banner" : "Pro feature"}
                    </span>
                  </button>
                )}
                <input
                  ref={heroInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadHero(file);
                    e.target.value = "";
                  }}
                />
              </div>

              <Field label="Store description" htmlFor="store-desc">
                <textarea
                  id="store-desc"
                  className="flex min-h-[90px] w-full rounded-xl border border-navy-200 bg-white px-3.5 py-3 text-sm text-ink placeholder:text-ink-muted focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
                  value={description}
                  maxLength={600}
                  onChange={(e) => { setDescription(e.target.value); markDirty(); }}
                />
              </Field>
            </div>
          </div>

          {/* QR + share */}
          <div className="rounded-3xl border border-navy-100 bg-white p-6 shadow-soft">
            <p className="text-[13px] font-medium text-ink-secondary">Share & QR code</p>
            {qr && (
              <div className="mt-4 flex items-center gap-4">
                <img src={qr} alt="Store QR code" className="h-24 w-24 rounded-xl border border-navy-100" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      const a = document.createElement("a");
                      a.href = qr;
                      a.download = `${business.slug}-qr.png`;
                      a.click();
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download QR
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setShareOpen(!shareOpen)}
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Share store
                  </Button>
                </div>
              </div>
            )}
            {shareOpen && (
              <div className="mt-4 space-y-2 rounded-xl border border-navy-100 p-3 animate-fade-in">
                <ShareButtons storeUrl={storeUrl} businessName={business.name} />
              </div>
            )}
            <button
              onClick={() => {
                void navigator.clipboard?.writeText(storeUrl);
                toast.success("Link copied", storeUrl);
              }}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-navy-200 px-4 py-2.5 text-[13px] font-medium text-navy-800 transition-colors hover:bg-navy-50"
            >
              <Link2 className="h-3.5 w-3.5" />
              Copy store link
            </button>
          </div>
        </div>

        {/* Live preview */}
        <div className="lg:col-span-3">
          <div className="sticky top-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[13px] font-medium text-ink-secondary">Live preview</p>
              <div className="flex rounded-xl border border-navy-100 bg-white p-1">
                {([
                  ["desktop", Monitor],
                  ["tablet", Tablet],
                  ["mobile", Smartphone],
                ] as const).map(([mode, Icon]) => (
                  <button
                    key={mode}
                    onClick={() => setPreviewMode(mode)}
                    className={`rounded-lg p-2 transition-colors ${
                      previewMode === mode ? "bg-navy-900 text-white" : "text-ink-muted"
                    }`}
                    aria-label={`${mode} preview`}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>
            <div
              className={`mx-auto overflow-hidden rounded-3xl border border-navy-200 bg-white shadow-lift transition-all duration-300 ${
                previewMode === "mobile"
                  ? "max-w-[340px]"
                  : previewMode === "tablet"
                    ? "max-w-[560px]"
                    : "max-w-full"
              }`}
            >
              <StorefrontPreview
                business={business}
                theme={theme}
                accent={accent}
                showBranding={showBranding}
                heroUrl={heroUrl}
                description={description}
              />
            </div>
            {!isPro && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
                <CreditCard className="h-3.5 w-3.5" />
                Upgrade to Pro for premium themes, accent colors, banners and
                branding removal.
              </p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function ShareButtons({ storeUrl, businessName }: { storeUrl: string; businessName: string }) {
  const message = `Check out my products and prices on PRICELIST 👇\n${storeUrl}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(message)}`;
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(storeUrl)}`;
  const x = `https://twitter.com/intent/tweet?url=${encodeURIComponent(storeUrl)}&text=${encodeURIComponent(businessName)}`;
  return (
    <>
      {[
        ["WhatsApp", wa, "#075E54"],
        ["Facebook", fb, "#163D6B"],
        ["X (Twitter)", x, "#0A1728"],
      ].map(([label, href, color]) => (
        <a
          key={label as string}
          href={href as string}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-navy-50"
        >
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: color as string }} />
          Share on {label}
        </a>
      ))}
    </>
  );
}

function StorefrontPreview({
  business,
  theme,
  accent,
  showBranding,
  heroUrl,
  description,
}: {
  business: BusinessData;
  theme: Theme;
  accent: string;
  showBranding: boolean;
  heroUrl: string | null;
  description: string;
}) {
  const t = theme.tokens;
  const vars = {
    "--pl-bg": t.bg,
    "--pl-surface": t.surface,
    "--pl-surface-alt": t.surfaceAlt,
    "--pl-border": t.border,
    "--pl-text": t.text,
    "--pl-text-secondary": t.textSecondary,
    "--pl-muted": t.muted,
    "--pl-primary": t.primary,
    "--pl-primary-hover": t.primaryHover,
    "--pl-on-primary": t.onPrimary,
    "--pl-accent": accent || t.accent,
    "--pl-on-accent": t.onAccent,
  } as React.CSSProperties;

  const fontClass = theme.fonts.heading === "serif" ? "font-serif" : "font-heading";

  return (
    <div style={{ ...vars, background: t.bg, color: t.text }} className="min-h-[420px]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-5 py-4" style={{ borderColor: t.border }}>
        {business.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={business.logoUrl} alt="" className="h-10 w-10 rounded-xl object-cover" />
        ) : (
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl font-heading text-sm font-bold"
            style={{ background: t.primary, color: t.onPrimary }}
          >
            {business.name.slice(0, 2).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className={`truncate text-[15px] font-semibold ${fontClass}`}>{business.name}</p>
          <p className="truncate text-xs" style={{ color: t.muted }}>
            Storefront preview
          </p>
        </div>
        <span
          className="ml-auto rounded-full px-3 py-1.5 text-[11px] font-semibold"
          style={{ background: t.primary, color: t.onPrimary }}
        >
          WhatsApp
        </span>
      </div>

      {heroUrl && (
        <div className="relative h-32">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroUrl} alt="Banner" className="h-full w-full object-cover" />
        </div>
      )}

      <div className="px-5 py-5">
        <p className={`text-lg font-semibold ${fontClass}`}>Welcome to {business.name}</p>
        <p className="mt-1 text-[13px] leading-relaxed" style={{ color: t.textSecondary }}>
          {description || "Your store description appears here. Add products to start selling."}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border"
              style={{ borderColor: t.border, background: t.surface }}
            >
              <div className="flex aspect-square items-center justify-center" style={{ background: t.surfaceAlt }}>
                <span className="text-2xl" style={{ color: t.muted }}>◆</span>
              </div>
              <div className="space-y-1.5 p-3">
                <p className="h-2.5 w-3/4 rounded" style={{ background: t.border }} />
                <p
                  className="h-3 w-1/2 rounded font-semibold"
                  style={{ background: t.accent }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        className="mt-2 flex items-center justify-between border-t px-5 py-3"
        style={{ borderColor: t.border, background: t.surface }}
      >
        <span className="text-xs" style={{ color: t.muted }}>
          {showBranding ? "Powered by PRICELIST" : ""}
        </span>
        <span className="text-xs font-semibold" style={{ color: t.primary }}>
          3 items — ₦85,000
        </span>
      </div>
    </div>
  );
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

void QrCode;
void isPaystackConfigured;
