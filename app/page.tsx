"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronDown,
  MessageCircle,
  QrCode,
  Search,
  ShoppingBag,
  Smartphone,
  Share2,
  Package,
  Palette,
  BarChart3,
  CreditCard,
  ShieldCheck,
  Zap,
  Star,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/plans";
import { formatNaira } from "@/lib/money";

/* ---------------- Hero mock storefront ---------------- */

const MOCK_PRODUCTS = [
  { name: "Air Max Sneakers", price: "₦45,000", tag: "New" },
  { name: "Classic White Sneakers", price: "₦28,500" },
  { name: "Premium Slides", price: "₦18,000", tag: "Sale", was: "₦24,000" },
  { name: "Streetwear Hoodie", price: "₦32,000" },
  { name: "Leather Chelsea Boots", price: "₦68,000" },
  { name: "Canvas Tote Bag", price: "₦9,500" },
];

function MockStorefront() {
  const [added, setAdded] = useState<string | null>(null);
  return (
    <div className="relative mx-auto w-full max-w-[340px] overflow-hidden rounded-[28px] border border-navy-100 bg-white shadow-lift">
      {/* Phone status */}
      <div className="flex items-center justify-between bg-navy-900 px-6 pb-2 pt-3 text-[10px] text-navy-200">
        <span>9:41</span>
        <span className="h-1.5 w-1.5 rounded-full bg-gold" />
        <span className="flex gap-1">
          <span className="h-1 w-3 rounded-sm bg-navy-600" />
          <span className="h-1 w-3 rounded-sm bg-navy-600" />
        </span>
      </div>
      {/* Store header */}
      <div className="bg-navy-900 px-5 pb-5 pt-3 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold font-heading text-lg font-semibold text-navy-950">
            CK
          </div>
          <div>
            <p className="font-heading text-[15px] font-semibold">Chuks Kicks</p>
            <p className="text-[11px] text-navy-300">Sneakers & Footwear · Lagos</p>
          </div>
          <span className="ml-auto flex items-center gap-1 rounded-full bg-[#123C2A] px-2 py-0.5 text-[10px] font-medium text-[#7BD8A8]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4ADE80]" />
            Open
          </span>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-navy-800 px-3 py-2 text-[11px] text-navy-300">
          <Search className="h-3.5 w-3.5" />
          Search sneakers, boots…
        </div>
      </div>
      {/* Products */}
      <div className="grid grid-cols-2 gap-3 p-4">
        {MOCK_PRODUCTS.map((p) => (
          <div key={p.name} className="group">
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-navy-50">
              <div className="absolute inset-0 bg-gradient-to-br from-navy-100 to-navy-200 transition-transform duration-300 group-hover:scale-105" />
              <Package className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-navy-300" />
              {p.tag && (
                <span
                  className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                    p.tag === "Sale"
                      ? "bg-gold text-navy-950"
                      : "bg-navy-900 text-white"
                  }`}
                >
                  {p.tag}
                </span>
              )}
            </div>
            <p className="mt-2 text-[12px] font-medium leading-tight text-ink">
              {p.name}
            </p>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-[13px] font-semibold text-navy-900">{p.price}</span>
              {p.was && (
                <span className="text-[10px] text-ink-muted line-through">{p.was}</span>
              )}
            </div>
            <button
              onClick={() => setAdded(p.name)}
              className="mt-1.5 flex h-7 w-full items-center justify-center rounded-lg bg-navy-900 text-[11px] font-medium text-white transition-colors hover:bg-navy-700"
            >
              {added === p.name ? "Added ✓" : "Add"}
            </button>
          </div>
        ))}
      </div>
      {/* Sticky order bar */}
      <div className="sticky bottom-0 flex items-center justify-between border-t border-navy-50 bg-white/95 px-4 py-3 backdrop-blur">
        <span className="text-[12px] font-medium text-ink-secondary">
          3 items — <span className="font-semibold text-ink">₦91,500</span>
        </span>
        <span className="flex items-center gap-1.5 rounded-xl bg-[#075E54] px-3.5 py-1.5 text-[11px] font-semibold text-white">
          <MessageCircle className="h-3.5 w-3.5" />
          ORDER VIA WHATSAPP
        </span>
      </div>
    </div>
  );
}

/* ---------------- Sections ---------------- */

const STEPS = [
  {
    n: "01",
    title: "Create your business page",
    text: "Add your business name, logo, WhatsApp number and a short description.",
  },
  {
    n: "02",
    title: "Add your products or services",
    text: "Beautiful cards with images and prices — for sneakers, wigs, jollof, photography, anything.",
  },
  {
    n: "03",
    title: "Share your unique link",
    text: "pricelist.ng/your-business works on WhatsApp, Instagram, flyers, QR codes — anywhere.",
  },
  {
    n: "04",
    title: "Customers browse and build orders",
    text: "They tap items, see quantities and the total update instantly. No app, no sign-up.",
  },
  {
    n: "05",
    title: "The order opens in WhatsApp",
    text: "One tap sends a perfectly formatted order message straight to your WhatsApp.",
  },
];

const FEATURES = [
  {
    icon: Smartphone,
    title: "Mobile-first storefront",
    text: "Your store looks stunning on every phone — and your customers are on phones.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp ordering",
    text: "Orders arrive as clean, formatted messages. Keep selling where you already sell.",
  },
  {
    icon: QrCode,
    title: "Instant QR code",
    text: "Every store gets a QR code for flyers, business cards and packaging.",
  },
  {
    icon: Palette,
    title: "Premium themes",
    text: "Classic Navy, Luxury, Midnight and more — Pro unlocks them all.",
  },
  {
    icon: BarChart3,
    title: "Real analytics",
    text: "Store views, product views and WhatsApp order clicks — no spreadsheets.",
  },
  {
    icon: ShieldCheck,
    title: "Plan limits enforced",
    text: "Free starts at 5 products. Upgrade when you're ready — never pay for what you don't need.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "I share one link on my WhatsApp status and customers order themselves. No more typing prices in the night.",
    name: "Example testimonial — fashion vendor, Lagos",
    placeholder: true,
  },
  {
    quote:
      "The WhatsApp message comes through exactly like I would have written it. My customers didn't notice any difference.",
    name: "Example testimonial — beauty business, Abuja",
    placeholder: true,
  },
  {
    quote:
      "Setting up my menu took less than ten minutes, from my phone, while I was cooking.",
    name: "Example testimonial — restaurant owner, Port Harcourt",
    placeholder: true,
  },
];

const FAQS = [
  {
    q: "Do my customers need an account or an app?",
    a: "No. Customers open your link, tap items, and order through WhatsApp. Zero friction.",
  },
  {
    q: "How do I receive orders?",
    a: "When a customer taps 'Order via WhatsApp', a formatted message with their items, quantities and total opens in WhatsApp to your business number. PRICELIST also records the order in your dashboard.",
  },
  {
    q: "How much does it cost?",
    a: "Free forever for up to 5 products. Starter is ₦1,500/month for up to 50 products. Pro is ₦3,000/month with unlimited products and all premium themes.",
  },
  {
    q: "Does PRICELIST process payments?",
    a: "Not yet — orders are placed through WhatsApp so you keep your existing payment flow. Subscription payments are processed securely via Paystack.",
  },
  {
    q: "Can I use my own logo and colors?",
    a: "Yes. Upload your logo, pick a theme and accent color (Pro), and your store reflects your brand.",
  },
  {
    q: "Is my store link really mine?",
    a: "Yes — you get a unique public URL like pricelist.ng/your-business that you can share anywhere: WhatsApp, Instagram, TikTok, flyers, QR codes, business cards.",
  },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <div className="min-h-screen bg-surface">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-navy-100/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="PRICELIST home">
            <Logo size="md" />
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-ink-secondary md:flex">
            <a href="#how" className="transition-colors hover:text-navy-900">How it works</a>
            <a href="#features" className="transition-colors hover:text-navy-900">Features</a>
            <a href="#pricing" className="transition-colors hover:text-navy-900">Pricing</a>
            <a href="#faq" className="transition-colors hover:text-navy-900">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden rounded-xl px-4 py-2 text-sm font-medium text-ink-secondary transition-colors hover:text-navy-900 sm:block">
              Sign in
            </Link>
            <Link href="/register">
              <Button size="sm">Create Free Price List</Button>
            </Link>
            <button
              className="rounded-lg p-2 text-ink-secondary md:hidden"
              onClick={() => setMobileMenu(!mobileMenu)}
              aria-label="Menu"
            >
              <ChevronDown className={`h-5 w-5 transition-transform ${mobileMenu ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>
        {mobileMenu && (
          <nav className="border-t border-navy-50 bg-white px-4 py-3 md:hidden">
            {[
              ["How it works", "#how"],
              ["Features", "#features"],
              ["Pricing", "#pricing"],
              ["FAQ", "#faq"],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-ink-secondary"
              >
                {label}
              </a>
            ))}
          </nav>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -top-40 right-[-10%] h-[480px] w-[480px] rounded-full opacity-[0.05]"
          style={{ background: "radial-gradient(circle, #C9A45C, transparent 65%)" }}
        />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-2 lg:pb-28 lg:pt-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold-faint px-3.5 py-1.5 text-xs font-medium text-gold-deep">
              <Sparkles className="h-3.5 w-3.5" />
              Made for Nigerian businesses
            </p>
            <h1 className="mt-6 font-heading text-[42px] font-bold leading-[1.05] tracking-tight text-navy-900 sm:text-6xl">
              One link.
              <br />
              All your <span className="text-gold-deep">prices.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-secondary">
              Create a beautiful online price list for your business, share it
              anywhere, and let customers order directly through WhatsApp.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/register">
                <Button size="lg">
                  Create Your Free Price List
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#how">
                <Button size="lg" variant="outline">
                  See How It Works
                </Button>
              </a>
            </div>
            <p className="mt-5 flex items-center gap-2 text-[13px] text-ink-muted">
              <Check className="h-4 w-4 text-success" />
              Free plan · No card required · Live in about 5 minutes
            </p>
          </div>
          <div className="flex justify-center lg:justify-end">
            <MockStorefront />
          </div>
        </div>
      </section>

      {/* Dark strip — trust bar */}
      <section className="bg-navy-950 py-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-4 text-center sm:px-6">
          {([
            ["WhatsApp", MessageCircle] as const,
            ["Instagram", Share2] as const,
            ["QR codes", QrCode] as const,
            ["Anywhere", Share2] as const,
          ] as const).map(([label, Icon]) => (
            <span key={label as string} className="flex items-center gap-2 text-sm font-medium text-navy-200">
              <Icon className="h-4 w-4 text-gold" />
              Share on {label}
            </span>
          ))}
          <span className="flex items-center gap-2 text-sm font-medium text-navy-200">
            <Zap className="h-4 w-4 text-gold" />
            Customers never need an account
          </span>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-deep">
            How it works
          </p>
          <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
            From hearing about us to live store in minutes
          </h2>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step) => (
            <div
              key={step.n}
              className="group rounded-2xl border border-navy-100 bg-white p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift"
            >
              <span className="font-heading text-sm font-bold text-gold-deep">{step.n}</span>
              <h3 className="mt-3 text-[15px] font-semibold text-ink">{step.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-y border-navy-100 bg-white py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-deep">
              Everything you need
            </p>
            <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
              A complete storefront, minus the complexity
            </h2>
          </div>
          <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title}>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-50 text-navy-700">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-[15px] font-semibold text-ink">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-deep">
            Pricing
          </p>
          <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
            Simple plans that grow with you
          </h2>
          <p className="mt-3 text-ink-secondary">
            Start free. Upgrade when your business does. Cancel anytime.
          </p>
        </div>
        <div className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-3">
          {(["FREE", "STARTER", "PRO"] as const).map((planId) => {
            const plan = PLANS[planId];
            const featured = planId === "STARTER";
            return (
              <div
                key={planId}
                className={`relative flex flex-col rounded-3xl border bg-white p-7 ${
                  featured
                    ? "border-navy-900 shadow-lift lg:-translate-y-2"
                    : "border-navy-100 shadow-soft"
                }`}
              >
                {plan.badge && (
                  <span
                    className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-semibold ${
                      featured ? "bg-navy-900 text-white" : "bg-gold-faint text-gold-deep"
                    }`}
                  >
                    {plan.badge}
                  </span>
                )}
                <h3 className="font-heading text-lg font-semibold text-ink">{plan.name}</h3>
                <p className="text-[13px] text-ink-muted">{plan.tagline}</p>
                <p className="mt-5">
                  <span className="font-heading text-4xl font-bold tracking-tight text-navy-900">
                    {formatNaira(plan.priceKobo)}
                  </span>
                  <span className="text-sm text-ink-muted">/month</span>
                </p>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.features.slice(0, planId === "FREE" ? 8 : 9).map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-[13px] text-ink-secondary">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="mt-7">
                  <Button
                    variant={featured ? "gold" : planId === "PRO" ? "primary" : "outline"}
                    className="w-full"
                    size="lg"
                  >
                    {planId === "FREE" ? "Start for free" : `Choose ${plan.name}`}
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* Testimonials — clearly marked placeholders */}
      <section className="border-y border-navy-100 bg-white py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-deep">
                Testimonials
              </p>
              <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
                Loved by sellers across Nigeria
              </h2>
            </div>
            <p className="text-xs text-ink-muted">
              Placeholder testimonials — real customer stories coming soon.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="flex flex-col rounded-2xl border border-navy-100 bg-surface p-6">
                <div className="flex gap-0.5 text-gold">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-ink">
                  "{t.quote}"
                </blockquote>
                <figcaption className="mt-5 text-[13px] font-medium text-ink-secondary">
                  {t.name}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-deep">
            FAQ
          </p>
          <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
            Questions, answered
          </h2>
        </div>
        <div className="mt-10 space-y-3">
          {FAQS.map((faq, i) => (
            <div
              key={faq.q}
              className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-soft"
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left"
                aria-expanded={openFaq === i}
              >
                <span className="text-[15px] font-semibold text-ink">{faq.q}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-ink-muted transition-transform duration-200 ${
                    openFaq === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div
                className={`grid transition-all duration-200 ${
                  openFaq === i ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <p className="px-6 pb-5 text-sm leading-relaxed text-ink-secondary">
                    {faq.a}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-navy-950 py-20">
        <div
          className="pointer-events-none absolute -bottom-48 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full opacity-[0.07]"
          style={{ background: "radial-gradient(ellipse, #C9A45C, transparent 65%)" }}
        />
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <ShoppingBag className="mx-auto h-8 w-8 text-gold" />
          <h2 className="mt-5 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Your business. Your prices.
            <br />
            One simple link.
          </h2>
          <p className="mt-4 text-navy-200">
            Put your business online. Sell on WhatsApp. Create your free price
            list in about five minutes — right from your phone.
          </p>
          <div className="mt-8">
            <Link href="/register">
              <Button variant="gold" size="lg">
                Create Your Free Price List
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-navy-800 bg-navy-950 pb-10 pt-14">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo light size="md" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-navy-300">
              One link. All your prices. The simplest way for Nigerian businesses
              to sell through WhatsApp.
            </p>
            <div className="mt-5 flex items-center gap-2 text-xs text-navy-400">
              <CreditCard className="h-3.5 w-3.5" />
              Secure payments by Paystack
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-navy-400">Product</p>
            <ul className="mt-4 space-y-2.5 text-sm text-navy-200">
              <li><a href="#how" className="transition-colors hover:text-white">How it works</a></li>
              <li><a href="#features" className="transition-colors hover:text-white">Features</a></li>
              <li><a href="#pricing" className="transition-colors hover:text-white">Pricing</a></li>
              <li><a href="#faq" className="transition-colors hover:text-white">FAQ</a></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-navy-400">Account</p>
            <ul className="mt-4 space-y-2.5 text-sm text-navy-200">
              <li><Link href="/login" className="transition-colors hover:text-white">Sign in</Link></li>
              <li><Link href="/register" className="transition-colors hover:text-white">Create store</Link></li>
              <li><Link href="/dashboard" className="transition-colors hover:text-white">Dashboard</Link></li>
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-12 flex max-w-6xl flex-wrap items-center justify-between gap-3 border-t border-navy-800 px-4 pt-6 text-xs text-navy-400 sm:px-6">
          <p>© {new Date().getFullYear()} PRICELIST. All rights reserved.</p>
          <p>Built for Nigerian entrepreneurs.</p>
        </div>
      </footer>
    </div>
  );
}
