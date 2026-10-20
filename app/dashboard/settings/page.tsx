"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Settings as SettingsIcon,
  Upload,
  X,
  Clock,
  Globe,
  Instagram,
  Facebook,
  Music2,
  Link2,
  Check,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { businessCategoryOptions } from "@/lib/validation";

interface Business {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  logoUrl: string | null;
  whatsappNumber: string | null;
  phone: string | null;
  address: string | null;
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  x: string | null;
  website: string | null;
}

interface DayHours {
  day: number;
  isOpen: boolean;
  opensAt: string;
  closesAt: string;
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function SettingsPage() {
  const toast = useToast();
  const [business, setBusiness] = useState<Business | null>(null);
  const [hours, setHours] = useState<DayHours[]>([]);
  const [saving, setSaving] = useState(false);
  const [savingHours, setSavingHours] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [logoUploading, setLogoUploading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "OTHER",
    description: "",
    whatsappNumber: "",
    phone: "",
    address: "",
    instagram: "",
    tiktok: "",
    facebook: "",
    x: "",
    website: "",
  });

  const load = useCallback(async () => {
    const res = await fetch("/api/businesses");
    const data = await res.json();
    if (!data.business) return;
    const b: Business = data.business;
    setBusiness(b);
    setForm({
      name: b.name,
      category: b.category,
      description: b.description ?? "",
      whatsappNumber: b.whatsappNumber ?? "",
      phone: b.phone ?? "",
      address: b.address ?? "",
      instagram: b.instagram ?? "",
      tiktok: b.tiktok ?? "",
      facebook: b.facebook ?? "",
      x: b.x ?? "",
      website: b.website ?? "",
    });
    setHours(
      Array.from({ length: 7 }, (_, day) => {
        const found = (data.business.hours ?? []).find(
          (h: DayHours) => h.day === day,
        );
        return (
          found ?? { day, isOpen: day < 5, opensAt: "09:00", closesAt: "18:00" }
        );
      }),
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveProfile() {
    if (!business) return;
    setSaving(true);
    setErrors({});
    try {
      const res = await fetch(`/api/businesses/${business.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors(data.fieldErrors ?? {});
        toast.error(data.error ?? "Could not save", "Please check the form.");
        return;
      }
      setBusiness(data.business);
      toast.success("Profile saved", "Your storefront is updated.");
    } catch {
      toast.error("Something went wrong", "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function saveHours() {
    if (!business) return;
    setSavingHours(true);
    try {
      const res = await fetch("/api/businesses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours }),
      });
      if (!res.ok) {
        toast.error("Could not save hours", "Please try again.");
        return;
      }
      toast.success("Business hours updated", "Your open/closed status is live.");
    } catch {
      toast.error("Something went wrong", "Please try again.");
    } finally {
      setSavingHours(false);
    }
  }

  async function uploadLogo(file: File) {
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
    setLogoUploading(true);
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
      const putRes = await fetch(`/api/businesses/${business!.id}/logo`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: data.url }),
      });
      const putData = await putRes.json().catch(() => ({}));
      if (!putRes.ok) {
        toast.error("Could not set logo", "Please try again.");
        return;
      }
      setBusiness(putData.business);
      toast.success("Logo updated");
    } finally {
      setLogoUploading(false);
    }
  }

  if (!business) {
    return (
      <DashboardLayout userName={null}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-40 rounded-lg bg-neutral-100" />
          <div className="h-72 rounded-xl bg-neutral-100" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userName={null} storeSlug={business.slug}>
      <div className="mb-7">
        <h1 className="font-heading text-headline font-semibold text-ink">
          Settings
        </h1>
        <p className="mt-1 text-caption text-ink-muted">
          Business profile, contact details and opening hours.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Profile */}
          <Card>
            <CardHeader title="Business profile" subtitle="Shown on your public storefront" />
            <CardBody>
              <div className="flex items-center gap-5">
                <div className="relative">
                  {business.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={business.logoUrl}
                      alt={business.name}
                      className="h-20 w-20 rounded-xl object-cover shadow-soft"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-navy-900 font-heading text-2xl font-bold text-gold">
                      {business.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <button
                    onClick={() => document.getElementById("settings-logo")?.click()}
                    className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-xl border border-neutral-200 bg-white text-navy-700 shadow-soft transition-colors hover:bg-neutral-50"
                    aria-label="Change logo"
                  >
                    {logoUploading ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-navy-800" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <input
                    id="settings-logo"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadLogo(file);
                      e.target.value = "";
                    }}
                  />
                </div>
                <div>
                  <p className="font-heading text-lg font-semibold text-ink">{business.name}</p>
                  <p className="text-body text-ink-muted">
                    pricelist.ng/<span className="font-medium text-navy-800">{business.slug}</span>
                  </p>
                  <p className="mt-1 text-caption text-ink-muted">
                    PNG, JPG or WEBP · max 5 MB
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <Field label="Business name" htmlFor="s-name" error={errors.name}>
                  <Input
                    id="s-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </Field>
                <Field label="Category" htmlFor="s-category">
                  <Select
                    id="s-category"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    {businessCategoryOptions.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Description" htmlFor="s-description">
                    <Textarea
                      id="s-description"
                      rows={3}
                      maxLength={600}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </Field>
                </div>
                <Field
                  label="WhatsApp number"
                  htmlFor="s-whatsapp"
                  error={errors.whatsappNumber}
                  hint="Customer orders are sent here."
                >
                  <Input
                    id="s-whatsapp"
                    value={form.whatsappNumber}
                    onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
                  />
                </Field>
                <Field label="Phone number" htmlFor="s-phone" error={errors.phone}>
                  <Input
                    id="s-phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Address / location" htmlFor="s-address">
                    <Input
                      id="s-address"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                    />
                  </Field>
                </div>
              </div>

              <Button onClick={() => void saveProfile()} loading={saving} className="mt-6">
                <Check className="h-4 w-4" />
                Save profile
              </Button>
            </CardBody>
          </Card>

          {/* Social links */}
          <Card>
            <CardHeader title="Social links" subtitle="Displayed on your storefront" />
            <CardBody>
              <div className="grid gap-4 sm:grid-cols-2">
                <SocialField
                  label="Instagram"
                  icon={<Instagram className="h-4 w-4" />}
                  value={form.instagram}
                  onChange={(v) => setForm({ ...form, instagram: v })}
                  placeholder="instagram.com/yourbusiness"
                />
                <SocialField
                  label="TikTok"
                  icon={<Music2 className="h-4 w-4" />}
                  value={form.tiktok}
                  onChange={(v) => setForm({ ...form, tiktok: v })}
                  placeholder="tiktok.com/@yourbusiness"
                />
                <SocialField
                  label="Facebook"
                  icon={<Facebook className="h-4 w-4" />}
                  value={form.facebook}
                  onChange={(v) => setForm({ ...form, facebook: v })}
                  placeholder="facebook.com/yourbusiness"
                />
                <SocialField
                  label="X (Twitter)"
                  icon={<X className="h-4 w-4" />}
                  value={form.x}
                  onChange={(v) => setForm({ ...form, x: v })}
                  placeholder="x.com/yourbusiness"
                />
                <div className="sm:col-span-2">
                  <SocialField
                    label="Website"
                    icon={<Globe className="h-4 w-4" />}
                    value={form.website}
                    onChange={(v) => setForm({ ...form, website: v })}
                    placeholder="yourbusiness.com"
                  />
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => void saveProfile()}
                loading={saving}
                className="mt-5"
              >
                Save links
              </Button>
            </CardBody>
          </Card>
        </div>

        {/* Hours */}
        <Card className="h-fit">
          <CardHeader
            title="Business hours"
            subtitle="Timezone: Africa/Lagos"
          />
          <CardBody>
            <div className="space-y-1">
              {hours.map((h) => (
                <div
                  key={h.day}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                    h.isOpen ? "" : "opacity-60"
                  }`}
                >
                  <Clock className="h-4 w-4 shrink-0 text-ink-muted" />
                  <span className="w-24 text-body font-medium text-ink">{DAY_NAMES[h.day]}</span>
                  <Switch
                    small
                    checked={h.isOpen}
                    onChange={(checked) =>
                      setHours((all) =>
                        all.map((x) => (x.day === h.day ? { ...x, isOpen: checked } : x)),
                      )
                    }
                    label={`${DAY_NAMES[h.day]} open`}
                  />
                  {h.isOpen && (
                    <div className="flex items-center gap-1.5 text-caption text-ink-secondary">
                      <input
                        type="time"
                        value={h.opensAt}
                        onChange={(e) =>
                          setHours((all) =>
                            all.map((x) => (x.day === h.day ? { ...x, opensAt: e.target.value } : x)),
                          )
                        }
                        className="rounded-lg border border-neutral-300 bg-white px-1.5 py-1 text-caption text-ink"
                        aria-label={`${DAY_NAMES[h.day]} opening time`}
                      />
                      <span className="text-ink-muted">—</span>
                      <input
                        type="time"
                        value={h.closesAt}
                        onChange={(e) =>
                          setHours((all) =>
                            all.map((x) => (x.day === h.day ? { ...x, closesAt: e.target.value } : x)),
                          )
                        }
                        className="rounded-lg border border-neutral-300 bg-white px-1.5 py-1 text-caption text-ink"
                        aria-label={`${DAY_NAMES[h.day]} closing time`}
                      />
                    </div>
                  )}
                  {h.isOpen && <span className="ml-auto text-caption text-ink-muted">Open</span>}
                  {!h.isOpen && <span className="ml-auto text-caption text-danger">Closed</span>}
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={() => void saveHours()}
              loading={savingHours}
              className="mt-4 w-full"
            >
              <Check className="h-4 w-4" />
              Save hours
            </Button>
            <p className="mt-3 flex items-start gap-1.5 text-caption leading-relaxed text-ink-muted">
              <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Customers see a live &quot;Open / Closed&quot; indicator on your storefront,
              calculated in your timezone.
            </p>
          </CardBody>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function SocialField({
  label,
  icon,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <Field label={label} htmlFor={`social-${label}`}>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted">
          {icon}
        </span>
        <Input
          id={`social-${label}`}
          className="pl-10"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </Field>
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
