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
  Smartphone,
  Share2,
  Package,
  BarChart3,
  ImageIcon,
  Clock,
} from "lucide-react";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/plan-data";
import { formatNaira } from "@/lib/money";
import { buildOrderMessage } from "@/lib/whatsapp";
import { StorefrontSample } from "@/components/storefront/sample-store";

const STEPS = [
  {
    n: "01",
    title: "Add your business",
    text: "Your name, logo, WhatsApp number and where you deliver. That becomes the top of your page.",
  },
  {
    n: "02",
    title: "List what you sell",
    text: "Each product takes a photo, a price and a line about it. Group products into categories.",
  },
  {
    n: "03",
    title: "Share one link",
    text: "You get an address like pricelist.ng/your-business. Put it in your bio, your status, a flyer or a QR code.",
  },
  {
    n: "04",
    title: "Take the order on WhatsApp",
    text: "Customers pick what they want and send it to you. The order is written out for them and recorded in your dashboard.",
  },
];

const FOR_CUSTOMERS = [
  {
    icon: Smartphone,
    title: "A page that opens straight away",
    text: "No app to install, no account to create, no sign-up form in the way.",
  },
  {
    icon: Package,
    title: "Prices they can read",
    text: "Every product shows a clear naira price, with a description and a photo if you add one.",
  },
  {
    icon: Search,
    title: "Search and categories",
    text: "Customers filter by category or search by name instead of messaging you to ask.",
  },
  {
    icon: MessageCircle,
    title: "One tap to order",
    text: "The basket becomes a WhatsApp message with the items, quantities and total already written.",
  },
];

const FOR_YOU = [
  {
    icon: ImageIcon,
    title: "Your logo and your description",
    text: "The page opens with your business on it, not a PRICELIST advert.",
  },
  {
    icon: QrCode,
    title: "A QR code for anything printed",
    text: "Download one for a flyer, a business card, a table tent or packaging.",
  },
  {
    icon: Clock,
    title: "Prices you can change any time",
    text: "Update a price, edit a description or hide a product. The page updates straight away.",
  },
  {
    icon: BarChart3,
    title: "A record of every order",
    text: "Each WhatsApp order is logged, so you can see what was asked for and mark it confirmed.",
  },
];

const PRICING_ROWS: Array<{
  label: string;
  values: [string, string, string];
}> = [
  { label: "Products", values: ["5", "50", "Unlimited"] },
  { label: "Categories", values: ["5", "25", "Unlimited"] },
  { label: "Store themes", values: ["Classic Navy", "Classic Navy", "All 7"] },
  { label: "Accent colour", values: ["—", "—", "Included"] },
  { label: "Banner image", values: ["—", "—", "Included"] },
  { label: "Remove PRICELIST branding", values: ["—", "—", "Included"] },
];

const FAQS = [
  {
    q: "Do my customers have to sign up?",
    a: "No. They open your link, choose their items and send the order. There is no app to install and no account to create.",
  },
  {
    q: "How do I get paid?",
    a: "PRICELIST does not take payments. The order arrives in your WhatsApp and you take the money the way you already do — transfer, cash or card machine. PRICELIST only handles the subscription.",
  },
  {
    q: "Can I change a price after I have shared the link?",
    a: "Yes. Prices, photos, descriptions and availability are all editable in the dashboard, and the change appears on your page straight away.",
  },
  {
    q: "What changes between the plans?",
    a: "Free covers 5 products and 5 categories. Starter covers 50 and 25. Pro removes the limits and adds the extra themes, an accent colour, a banner image and the option to take the PRICELIST branding off.",
  },
  {
    q: "Will my link change later?",
    a: "No. Your store keeps the same address — pricelist.ng/your-business — so links you have already printed and shared keep working.",
  },
  {
    q: "What happens when I reach my product limit?",
    a: "You can still browse and order from your existing products. Upgrade from the billing page when you want to add more — nothing about your catalogue or settings is lost.",
  },
];

const SAMPLE_ORDER = buildOrderMessage({
  businessName: "Chuks Kicks",
  whatsappNumber: "0801 234 5678",
  lines: [
    {
      name: "Air Max Sneakers",
      quantity: 1,
      priceKobo: 3_850_000,
      subtotalKobo: 3_850_000,
    },
    {
      name: "Streetwear Hoodie",
      quantity: 2,
      priceKobo: 3_200_000,
      subtotalKobo: 6_400_000,
    },
  ],
  subtotalKobo: 10_250_000,
  discountKobo: 0,
  totalKobo: 10_250_000,
  customerName: "David",
  customerPhone: "0703 555 0199",
  customerNote: "Please confirm size 42 is available.",
});

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <div className="min-h-screen bg-surface">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" aria-label="PRICELIST home">
            <Logo size="md" />
          </Link>
          <nav className="hidden items-center gap-7 text-body font-medium text-ink-secondary md:flex">
            <a href="#how" className="transition-colors hover:text-navy-900">How it works</a>
            <a href="#pricing" className="transition-colors hover:text-navy-900">Pricing</a>
            <a href="#faq" className="transition-colors hover:text-navy-900">Questions</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden rounded-md px-3 py-2 text-body font-medium text-ink-secondary transition-colors hover:text-navy-900 sm:block"
            >
              Sign in
            </Link>
            <Link href="/register">
              <Button size="sm" className="text-white">Create a price list</Button>
            </Link>
            <button
              className="rounded-md p-2 text-ink-secondary transition-colors hover:bg-neutral-100 md:hidden"
              onClick={() => setMobileMenu(!mobileMenu)}
              aria-label={mobileMenu ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenu}
            >
              <ChevronDown className={`h-5 w-5 transition-transform ${mobileMenu ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>
        {mobileMenu && (
          <nav className="border-t border-neutral-200 bg-white px-4 py-2 md:hidden">
            {[
              ["How it works", "#how"],
              ["Pricing", "#pricing"],
              ["Questions", "#faq"],
              ["Sign in", "/login"],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileMenu(false)}
                className="block rounded-md px-2 py-2.5 text-body font-medium text-ink-secondary"
              >
                {label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {/* Hero */}
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_0.85fr] lg:gap-14 lg:py-20">
          <div>
            <p className="text-caption font-medium uppercase tracking-[0.14em] text-gold-deep">
              For businesses that sell on WhatsApp
            </p>
            <h1 className="mt-4 font-heading font-bold text-hero sm:text-display">
              Put your products and prices on one link.
            </h1>
            <p className="mt-5 max-w-xl text-lead leading-relaxed text-ink-secondary">
              PRICELIST turns your catalogue into a page you can share anywhere.
              Customers browse it, add what they want, and send the order to your
              WhatsApp in one tap.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/register">
                <Button size="lg">
                  Create a free price list
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#how">
                <Button size="lg" variant="outline">
                  See how it works
                </Button>
              </a>
            </div>
            <p className="mt-5 text-caption text-ink-muted">
              Free for up to 5 products · No card needed · Set up in four steps
            </p>
          </div>

          <div>
            <div className="mx-auto max-w-[420px]">
              <StorefrontSample className="shadow-lift" />
              <p className="mt-3 text-center text-caption text-ink-muted">
                Sample storefront — Chuks Kicks
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-b border-neutral-200 bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="max-w-2xl">
            <h2 className="font-heading text-headline font-bold tracking-tight text-navy-900">
              From an empty account to a shareable link
            </h2>
            <p className="mt-3 text-body leading-relaxed text-ink-secondary">
              Four steps, and you never have to build or maintain a website.
            </p>
          </div>
          <ol className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {STEPS.map((step) => (
              <li key={step.n} className="border-t border-neutral-200 pt-5">
                <span className="font-heading text-caption font-bold text-gold-deep">
                  {step.n}
                </span>
                <h3 className="mt-2 font-heading text-title font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-body leading-relaxed text-ink-secondary">
                  {step.text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* The order on WhatsApp */}
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-24">
          <div>
            <h2 className="font-heading text-headline font-bold tracking-tight text-navy-900">
              The order arrives in WhatsApp, already written out
            </h2>
            <p className="mt-4 text-body leading-relaxed text-ink-secondary">
              Your customer taps one button. PRICELIST builds the message — items,
              quantities, the total and any note they left — and opens WhatsApp with
              it. They send it, you reply.
            </p>
            <ul className="mt-6 space-y-2.5">
              {[
                "Formatted the same way every time, so nothing is forgotten",
                "Saved to your dashboard as an order you can mark as confirmed",
                "No PRICELIST account, no app, no checkout page in the way",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-body text-ink-secondary">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-surface p-5">
            <div className="mb-4 flex items-center gap-2 text-caption font-medium text-ink-muted">
              <MessageCircle className="h-4 w-4 text-whatsapp" />
              WhatsApp
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap font-sans text-caption leading-relaxed text-ink">
              {SAMPLE_ORDER}
            </pre>
          </div>
        </div>
      </section>

      {/* What you and your customers get */}
      <section className="border-b border-neutral-200 bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="max-w-2xl">
            <h2 className="font-heading text-headline font-bold tracking-tight text-navy-900">
              A page for the customer, a dashboard for you
            </h2>
          </div>

          <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <h3 className="font-heading text-title font-semibold text-ink">
                On the customer&rsquo;s side
              </h3>
              <ul className="mt-5 space-y-6">
                {FOR_CUSTOMERS.map((f) => (
                  <li key={f.title} className="flex gap-4">
                    <f.icon className="mt-0.5 h-5 w-5 shrink-0 text-navy-700" aria-hidden="true" />
                    <div>
                      <h4 className="text-body font-semibold text-ink">{f.title}</h4>
                      <p className="mt-1 text-body leading-relaxed text-ink-secondary">
                        {f.text}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:border-l lg:border-neutral-200 lg:pl-16">
              <h3 className="font-heading text-title font-semibold text-ink">
                On yours
              </h3>
              <ul className="mt-5 space-y-6">
                {FOR_YOU.map((f) => (
                  <li key={f.title} className="flex gap-4">
                    <f.icon className="mt-0.5 h-5 w-5 shrink-0 text-navy-700" aria-hidden="true" />
                    <div>
                      <h4 className="text-body font-semibold text-ink">{f.title}</h4>
                      <p className="mt-1 text-body leading-relaxed text-ink-secondary">
                        {f.text}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="max-w-2xl">
            <h2 className="font-heading text-headline font-bold tracking-tight text-navy-900">
              What each plan gives you
            </h2>
            <p className="mt-3 text-body leading-relaxed text-ink-secondary">
              Every plan includes your storefront link, WhatsApp ordering, product
              photos, categories, search, sale prices, order history, analytics and a
              QR code. What changes is how much you can list and how the page looks.
            </p>
          </div>

          <div className="mt-10 overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-left">
              <thead>
                <tr className="border-b border-neutral-300">
                  <th scope="col" className="w-[34%] py-4 pr-4 text-caption font-medium text-ink-muted">
                    <span className="sr-only">Feature</span>
                  </th>
                  {(["FREE", "STARTER", "PRO"] as const).map((id) => (
                    <th key={id} scope="col" className="px-4 py-4 align-top">
                      <p className="font-heading text-title font-semibold text-ink">
                        {PLANS[id].name}
                      </p>
                      <p className="mt-1 font-heading text-headline font-bold leading-none text-navy-900">
                        {formatNaira(PLANS[id].priceKobo)}
                        <span className="ml-1 text-body font-normal text-ink-muted">
                          /month
                        </span>
                      </p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PRICING_ROWS.map((row) => (
                  <tr key={row.label} className="border-b border-neutral-100">
                    <th scope="row" className="py-3.5 pr-4 text-body font-medium text-ink-secondary">
                      {row.label}
                    </th>
                    {row.values.map((value, i) => (
                      <td
                        key={i}
                        className={`px-4 py-3.5 text-body ${
                          value === "—" ? "text-neutral-400" : "text-ink"
                        }`}
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td className="py-5" />
                  {(["FREE", "STARTER", "PRO"] as const).map((id) => (
                    <td key={id} className="px-4 py-5">
                      <Link href="/register">
                        <Button
                          variant={id === "FREE" ? "outline" : "primary"}
                          className="w-full"
                        >
                          {id === "FREE" ? "Start free" : `Choose ${PLANS[id].name}`}
                        </Button>
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-caption text-ink-muted">
            Subscriptions are billed in naira through Paystack. Cancel any time — your
            plan stays active until the end of the period you have paid for.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-b border-neutral-200 bg-surface">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-24">
          <h2 className="font-heading text-headline font-bold tracking-tight text-navy-900">
            Questions people ask
          </h2>
          <div className="mt-8 divide-y divide-neutral-200 border-y border-neutral-200">
            {FAQS.map((faq, i) => (
              <div key={faq.q}>
                <h3>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-center justify-between gap-4 py-4 text-left"
                    aria-expanded={openFaq === i}
                  >
                    <span className="text-title font-medium text-ink">{faq.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-ink-muted transition-transform duration-150 ${
                        openFaq === i ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </h3>
                {openFaq === i && (
                  <p className="pb-5 text-body leading-relaxed text-ink-secondary">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-navy-950">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:py-20">
          <h2 className="font-heading text-headline font-bold tracking-tight text-white">
            Make your price list today
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-body leading-relaxed text-white">
            Add your products, share the link, and take the next order in your
            WhatsApp. It is free for up to 5 products.
          </p>
          <div className="mt-7">
            <Link href="/register">
              <Button variant="primary" size="lg">
                Create a free price list
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy-950 pb-10 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 border-t border-navy-800 px-4 pt-12 sm:px-6 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo light size="md" />
            <p className="mt-4 max-w-sm text-body leading-relaxed text-navy-300">
              A price list you can share in one link, and orders that arrive in your
              WhatsApp.
            </p>
            <p className="mt-5 flex items-center gap-2 text-caption text-navy-400">
              <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
              Built for businesses in Nigeria
            </p>
          </div>
          <div>
            <p className="text-micro font-semibold uppercase tracking-wider text-navy-400">
              Product
            </p>
            <ul className="mt-4 space-y-2.5 text-body">
              <li><a href="#how" className="transition-colors hover:text-white">How it works</a></li>
              <li><a href="#pricing" className="transition-colors hover:text-white">Pricing</a></li>
              <li><a href="#faq" className="transition-colors hover:text-white">Questions</a></li>
            </ul>
          </div>
          <div>
            <p className="text-micro font-semibold uppercase tracking-wider text-navy-400">
              Account
            </p>
            <ul className="mt-4 space-y-2.5 text-body">
              <li><Link href="/login" className="transition-colors hover:text-white">Sign in</Link></li>
              <li><Link href="/register" className="transition-colors hover:text-white">Create a price list</Link></li>
              <li><Link href="/dashboard" className="transition-colors hover:text-white">Dashboard</Link></li>
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-10 flex max-w-6xl flex-wrap items-center justify-between gap-3 border-t border-navy-800 px-4 pt-6 text-caption text-navy-400 sm:px-6">
          <p>© {new Date().getFullYear()} PRICELIST</p>
          <p>Subscription payments by Paystack</p>
        </div>
      </footer>
    </div>
  );
}
