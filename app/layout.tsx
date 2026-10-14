import type { Metadata, Viewport } from "next";
import { Inter, Manrope, Playfair_Display } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "PRICELIST — One link. All your prices.",
    template: "%s | PRICELIST",
  },
  description:
    "Create a beautiful online price list for your business, share it anywhere, and let customers order directly through WhatsApp.",
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  keywords: [
    "price list",
    "WhatsApp business",
    "storefront",
    "Nigeria",
    "online store",
    "catalog",
  ],
  openGraph: {
    type: "website",
    siteName: "PRICELIST",
    title: "PRICELIST — One link. All your prices.",
    description:
      "Put your business online. Sell on WhatsApp. A beautiful price list in minutes.",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#071A33",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${manrope.variable} ${playfair.variable} font-sans`}
      >
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
